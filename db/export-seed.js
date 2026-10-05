// Mengubah db/seed-src/data.js + data-ext.js menjadi db/seed-data.json agar
// seeder PHP tidak perlu menafsirkan JavaScript (dan server tidak perlu Node).
// Jalankan ulang bila data purwarupa berubah: node db/export-seed.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'db/seed-src/data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'db/seed-src/data-ext.js'), 'utf8'), ctx);
vm.runInContext('globalThis.__d = SIMASET_DATA', ctx);
const D = ctx.__d;

const out = {};
Object.entries(D).forEach(([k, v]) => { out[k] = v; });
fs.writeFileSync(path.join(root, 'db/seed-data.json'), JSON.stringify(out, null, 1));

const n = Object.entries(out).filter(([, v]) => Array.isArray(v)).reduce((a, [, v]) => a + v.length, 0);
console.log(`seed-data.json: ${Object.keys(out).length} kunci, ${n} baris data`);
