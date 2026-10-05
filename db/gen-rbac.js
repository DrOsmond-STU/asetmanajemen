// Membangkitkan api/lib/rbac-matrix.php dari assets/js/rbac.js agar matriks
// hak akses di server tidak pernah menyimpang dari yang dipakai front-end.
// Jalankan ulang setiap kali rbac.js berubah: node db/gen-rbac.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/rbac.js'), 'utf8'), ctx);
vm.runInContext('globalThis.__x = { mods: RBAC_MODULES, access: ROLE_ACCESS, defs: ROLE_DEFS }', ctx);
const { mods, access, defs } = ctx.__x;

const php = (v) => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
let out = `<?php
// ==========================================================================
// DIBANGKITKAN OTOMATIS — JANGAN DISUNTING MANUAL
// Sumber : assets/js/rbac.js
// Perintah: node db/gen-rbac.js
// --------------------------------------------------------------------------
// Inilah batas keamanan yang sesungguhnya. Pemeriksaan hak akses di sisi
// peramban hanya mengatur tampilan; setiap permintaan API diperiksa di sini.
// ==========================================================================

const RBAC_MODULES = [
${mods.map(m => '  ' + php(m)).join(',\n')},
];

const ROLE_ACCESS = [
`;
Object.keys(defs).forEach(role => {
  const map = access[role] || {};
  out += `  ${php(role)} => [\n`;
  mods.forEach(m => { if(map[m]) out += `    ${php(m)} => ${php(map[m])},\n`; });
  out += `  ],\n`;
});
out += `];

const ROLE_DESC = [
${Object.entries(defs).map(([r, d]) => `  ${php(r)} => ${php(d.desc)},`).join('\n')}
];
`;
fs.writeFileSync(path.join(root, 'api/lib/rbac-matrix.php'), out);
const cells = Object.keys(defs).length * mods.length;
console.log(`rbac-matrix.php dibangkitkan: ${Object.keys(defs).length} peran x ${mods.length} modul = ${cells} sel`);
