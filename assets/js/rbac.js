// ==========================================================================
// SIMASET BMN — Role Based Access Control (RBAC)
// --------------------------------------------------------------------------
// Tingkat hak akses per modul:
//   'R'  = Lihat saja (read-only)
//   'RW' = Lihat + tambah/ubah data
//   'A'  = Lihat + tambah/ubah + menyetujui (approve/authorize)
//   (tidak terdaftar) = modul tidak tampil di menu & tidak dapat diakses
//
// Matriks ini mengikuti definisi peran pada dokumen rancangan SIMASET BMN.
// ==========================================================================

const RBAC_LEVEL_LABEL = {
  '-':  { label:'Tidak Ada Akses', cls:'b-slate' },
  'R':  { label:'Lihat',           cls:'b-blue'  },
  'RW': { label:'Lihat + Ubah',    cls:'b-green' },
  'A':  { label:'Lihat + Ubah + Setujui', cls:'b-amber' },
};

const ROLE_DEFS = {
  'Super Admin': {
    short:'Admin',
    desc:'Konfigurasi teknis sistem, master data dan integrasi. Tidak otomatis berwenang menyetujui transaksi operasional.',
  },
  'Asset Manager': {
    short:'Asset',
    desc:'Pemilik proses siklus hidup aset: kondisi, risiko, kinerja dan keputusan lifecycle. Menyetujui sensus, mutasi, maintenance, rekonsiliasi dan sanitisasi.',
  },
  'BMN Officer': {
    short:'BMN',
    desc:'Penatausahaan BMN: register, tagging QR/barcode, sensus, mutasi dan rekonsiliasi SAKTI/SIMAN.',
  },
  'Finance': {
    short:'Finance',
    desc:'Biaya dan nilai aset sesuai kewenangan: lifecycle cost, TCO, dan referensi nilai perolehan.',
  },
  'Maintenance': {
    short:'Maint',
    desc:'Pemeliharaan preventif/korektif, work order, dan tindak lanjut alarm telemetry IoT.',
  },
  'Inspector': {
    short:'Inspect',
    desc:'Inspeksi dan penilaian kondisi aset, serta pelaksanaan sensus lapangan.',
  },
  'Custodian': {
    short:'Cust',
    desc:'Aset yang menjadi tanggung jawabnya: acknowledgement, permintaan mutasi, dan pengembalian aset.',
  },
  'Cyber Officer': {
    short:'Cyber',
    desc:'Aset siber/kripto sensitif, sanitisasi media, dan otorisasi keamanan pada proses disposal.',
  },
  'Auditor': {
    short:'Audit',
    desc:'Akses baca pada seluruh modul untuk keperluan pemeriksaan dan pengumpulan evidence. Tidak dapat mengubah data.',
  },
  'Management': {
    short:'Mgmt',
    desc:'Dashboard eksekutif, laporan, dan persetujuan pada risiko, rekonsiliasi, sanitisasi dan disposal.',
  },
};

// Urutan modul mengikuti urutan navigasi
const RBAC_MODULES = [
  'dashboard', 'master-data', 'bmn-register', 'asset-lifecycle', 'qr-tag',
  'sensus', 'mutasi', 'custodian', 'jml',
  'maintenance', 'inspection', 'iot',
  'risk', 'performance', 'financial',
  'reconciliation', 'disposal',
  'cyber', 'sanitization',
  'governance', 'audit', 'documents',
  'reporting', 'integrasi', 'approval', 'access',
];

const ROLE_ACCESS = {

  // Konfigurasi teknis penuh, namun tanpa kewenangan approve transaksi.
  'Super Admin': {
    dashboard:'R', 'master-data':'RW', 'bmn-register':'RW', 'asset-lifecycle':'RW', 'qr-tag':'RW',
    sensus:'RW', mutasi:'RW', custodian:'RW', jml:'RW',
    maintenance:'RW', inspection:'RW', iot:'RW',
    risk:'RW', performance:'RW', financial:'RW',
    reconciliation:'RW', disposal:'RW',
    cyber:'RW', sanitization:'RW',
    governance:'RW', audit:'RW', documents:'RW',
    reporting:'RW', integrasi:'RW', approval:'R', access:'R',
  },

  // Lifecycle, risk, condition, decision + approver operasional.
  'Asset Manager': {
    dashboard:'R', 'master-data':'R', 'bmn-register':'RW', 'asset-lifecycle':'RW', 'qr-tag':'R',
    sensus:'A', mutasi:'A', custodian:'RW', jml:'R',
    maintenance:'A', inspection:'R', iot:'RW',
    risk:'RW', performance:'RW', financial:'R',
    reconciliation:'A', disposal:'RW',
    cyber:'A', sanitization:'A',
    governance:'RW', audit:'R', documents:'RW',
    reporting:'R', integrasi:'R', approval:'A', access:'R',
  },

  // Register, tagging, sensus, rekonsiliasi.
  'BMN Officer': {
    dashboard:'R', 'master-data':'R', 'bmn-register':'RW', 'asset-lifecycle':'R', 'qr-tag':'RW',
    sensus:'RW', mutasi:'RW', custodian:'RW', jml:'RW',
    maintenance:'R', inspection:'R',
    risk:'R', performance:'R', financial:'R',
    reconciliation:'RW', disposal:'RW',
    cyber:'R', sanitization:'R',
    governance:'R', audit:'R', documents:'RW',
    reporting:'R', integrasi:'R', approval:'R', access:'R',
  },

  // Biaya dan nilai aset sesuai kewenangan.
  'Finance': {
    dashboard:'R', 'bmn-register':'R', 'asset-lifecycle':'R',
    financial:'RW', performance:'R',
    reconciliation:'R', disposal:'R',
    audit:'R', documents:'R',
    reporting:'R', access:'R',
  },

  // PM/CM dan Work Order + tindak lanjut alarm IoT.
  'Maintenance': {
    dashboard:'R', 'bmn-register':'R', 'qr-tag':'R',
    maintenance:'RW', inspection:'R', iot:'RW',
    risk:'R', performance:'R',
    documents:'R', reporting:'R', access:'R',
  },

  // Inspeksi/kondisi dan pelaksanaan sensus.
  'Inspector': {
    dashboard:'R', 'bmn-register':'R', 'qr-tag':'R',
    sensus:'RW', maintenance:'R', inspection:'RW', iot:'R',
    performance:'R', documents:'R', reporting:'R', access:'R',
  },

  // Aset yang menjadi tanggung jawabnya.
  'Custodian': {
    dashboard:'R', 'bmn-register':'R', 'qr-tag':'R',
    mutasi:'RW', custodian:'R', jml:'RW',
    maintenance:'R', documents:'R', reporting:'R', access:'R',
  },

  // Sensitive asset, sanitisasi media, otorisasi disposal.
  'Cyber Officer': {
    dashboard:'R', 'bmn-register':'R',
    iot:'RW', risk:'RW',
    disposal:'A', cyber:'RW', sanitization:'RW',
    governance:'R', audit:'R', documents:'R',
    reporting:'R', integrasi:'R', approval:'A', access:'R',
  },

  // Read-only pada seluruh modul untuk pemeriksaan.
  'Auditor': {
    dashboard:'R', 'master-data':'R', 'bmn-register':'R', 'asset-lifecycle':'R', 'qr-tag':'R',
    sensus:'R', mutasi:'R', custodian:'R', jml:'R',
    maintenance:'R', inspection:'R', iot:'R',
    risk:'R', performance:'R', financial:'R',
    reconciliation:'R', disposal:'R',
    cyber:'R', sanitization:'R',
    governance:'R', audit:'R', documents:'R',
    reporting:'R', integrasi:'R', approval:'R', access:'R',
  },

  // Dashboard dan persetujuan.
  'Management': {
    dashboard:'R', 'bmn-register':'R',
    risk:'A', performance:'R', financial:'R',
    reconciliation:'A', disposal:'A',
    sanitization:'A', iot:'R',
    governance:'R', audit:'R',
    reporting:'R', integrasi:'R', approval:'A', access:'R',
  },
};

const RBAC = {
  level(role, moduleId){
    const map = ROLE_ACCESS[role];
    if(!map) return '-';
    return map[moduleId] || '-';
  },
  canRead(role, moduleId){ return this.level(role, moduleId) !== '-'; },
  canWrite(role, moduleId){ const l = this.level(role, moduleId); return l==='RW' || l==='A'; },
  canApprove(role, moduleId){ return this.level(role, moduleId) === 'A'; },
  // Daftar modul yang boleh dibuka oleh sebuah peran
  allowedModules(role){ return RBAC_MODULES.filter(m=> this.canRead(role, m)); },
  countByLevel(role){
    const out = { R:0, RW:0, A:0, '-':0 };
    RBAC_MODULES.forEach(m=> out[this.level(role, m)]++ );
    return out;
  },
  roleNames(){ return Object.keys(ROLE_DEFS); },
  describe(role){ return (ROLE_DEFS[role] && ROLE_DEFS[role].desc) || ''; },
  levelLabel(l){ return RBAC_LEVEL_LABEL[l] || RBAC_LEVEL_LABEL['-']; },
};
