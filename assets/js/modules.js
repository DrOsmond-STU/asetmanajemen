// ==========================================================================
// Module registry — navigation + generic list/detail configuration
// ==========================================================================

const NAV_GROUPS = [
  { id:'utama', label:'Utama' },
  { id:'register', label:'Master & Register' },
  { id:'lapangan', label:'Operasional Lapangan' },
  { id:'pemeliharaan', label:'Pemeliharaan & Kondisi' },
  { id:'kinerja', label:'Risiko & Kinerja' },
  { id:'bmn', label:'BMN & Kepatuhan' },
  { id:'siber', label:'Keamanan Siber' },
  { id:'governance', label:'Governance & Audit' },
  { id:'laporan', label:'Pelaporan' },
];

// Friendly labels for generic definition-grid rendering
const FIELD_LABELS = {
  asset_id:'Asset ID', bmn_uid:'BMN UID', satker:'Kode Satker', kode_barang:'Kode Barang', nup:'NUP',
  name:'Nama Aset', category:'Kategori', brand:'Merk', model:'Model', serial:'Serial Number',
  year:'Tahun Perolehan', value:'Nilai Perolehan', warranty_until:'Garansi s/d', location_label:'Lokasi',
  custodian_name:'Custodian', unit:'Unit Kerja', condition_label:'Kondisi', criticality:'Criticality',
  risk_level:'Risk Level', status:'Status', tag_id:'Tag ID', asset_name:'Nama Aset',
  qr_payload:'QR Payload', material:'Material Label', print_batch:'Batch Cetak', printed_at:'Tanggal Cetak',
  sensus_id:'ID Sensus', area:'Area', petugas:'Petugas', start_date:'Tanggal Mulai',
  target_count:'Target Aset', scanned_count:'Aset Discan', anomaly_count:'Jumlah Anomali',
  request_id:'ID Permintaan', change_type:'Jenis Perubahan', old_location:'Lokasi Lama', new_location:'Lokasi Baru',
  old_custodian:'Custodian Lama', new_custodian:'Custodian Baru', requestor:'Pemohon', approver:'Approver',
  request_date:'Tanggal Permintaan', reason:'Alasan',
  custodian_id:'ID Custodian', type:'Tipe', nip:'NIP', phone:'Telepon', asset_count:'Jumlah Aset',
  event_id:'ID Event', person:'Nama', event_type:'Jenis Event', event_date:'Tanggal Event',
  wo_id:'ID Work Order', priority:'Prioritas', technician:'Teknisi', vendor:'Vendor', problem:'Deskripsi Masalah',
  scheduled_date:'Tanggal Jadwal', completed_date:'Tanggal Selesai', cost:'Biaya', downtime_hours:'Downtime (jam)',
  inspection_id:'ID Inspeksi', inspector:'Inspector', date:'Tanggal',
  physical_condition:'Kondisi Fisik', performance:'Performa', reliability:'Reliabilitas', safety:'Keselamatan',
  maintenance:'Maintenance', documentation:'Dokumentasi', finding:'Temuan', recommendation:'Rekomendasi',
  risk_id:'ID Risiko', event:'Peristiwa Risiko', likelihood:'Likelihood', consequence:'Consequence',
  score:'Skor', level:'Level', control:'Kontrol', residual:'Residual Risk', owner:'Risk Owner',
  kpi_id:'ID KPI', availability:'Availability (%)', mtbf_days:'MTBF (hari)', mttr_hours:'MTTR (jam)',
  utilization:'Utilization (%)', ahi:'Asset Health Index', decision:'Rekomendasi Keputusan', period:'Periode',
  cost_id:'ID Biaya', cost_type:'Jenis Biaya', amount:'Nominal', source:'Sumber Anggaran',
  batch_id:'ID Batch', file:'File Sumber', total_items:'Total Item', matched:'Matched', exception:'Exception',
  item_id:'ID Item', match_status:'Status Match', exception_note:'Catatan Exception',
  cyber_asset_id:'ID Aset Siber', classification:'Klasifikasi', custodian:'Custodian',
  authorization:'Otorisasi', last_access:'Akses Terakhir', access_count_30d:'Akses 30 Hari', movement_monitoring:'Monitoring Pergerakan',
  log_id:'ID Log', user:'Pengguna', action:'Aksi', timestamp:'Waktu', result:'Hasil',
  sanitization_id:'ID Sanitasi', media:'Media', method:'Metode', operator:'Operator',
  verification:'Verifikasi', certificate_no:'No. Sertifikat', nist_ref:'Acuan Standar',
  disposal_id:'ID Disposal', assessment:'Hasil Assessment', approval:'Status Persetujuan', evidence:'Evidence',
  audit_id:'ID Audit', scope:'Ruang Lingkup', severity:'Severity', root_cause:'Root Cause',
  corrective_action:'Corrective Action', pic:'PIC', due_date:'Jatuh Tempo', repeat_finding:'Temuan Berulang',
  document_id:'ID Dokumen', version:'Versi', uploaded_by:'Diunggah oleh', uploaded_at:'Tanggal Unggah', expiry:'Kedaluwarsa',
  report_id:'ID Laporan',
};

function fLabel(key){ return FIELD_LABELS[key] || key; }

// ---- Badge helpers ---------------------------------------------------
function badgeClassFor(kind, value){
  const v = String(value||'').toLowerCase().trim();
  const map = {
    good:['sangat baik','baik','matched','selesai','aktif','lulus verifikasi','disetujui','closed','berhasil','terpasang','signed-off'],
    warn:['cukup','kurang','berjalan','menunggu','proses','dalam proses','direncanakan','terjadwal','medium','observation','minor','verifikasi','terbatas'],
    bad:['rusak berat','unmatched','mismatch','ditolak','overdue','high','critical','major','damaged','duplicate','not found','rahasia'],
  };
  // exact match first (status values are whole words/phrases, e.g. "Unmatched")
  if(map.bad.includes(v)) return 'b-red';
  if(map.good.includes(v)) return 'b-green';
  if(map.warn.includes(v)) return 'b-amber';
  // fallback to substring, bad checked before good to avoid "unmatched" matching "matched"
  if(map.bad.some(x=>v.includes(x))) return 'b-red';
  if(map.good.some(x=>v.includes(x))) return 'b-green';
  if(map.warn.some(x=>v.includes(x))) return 'b-amber';
  return 'b-slate';
}
function levelBadge(level){
  const v = String(level||'').toLowerCase();
  if(v==='critical') return 'b-red';
  if(v==='high') return 'b-amber';
  if(v==='medium') return 'b-blue';
  return 'b-slate';
}
function conditionBadge(score){
  if(score>=5) return 'b-green';
  if(score>=4) return 'b-green';
  if(score>=3) return 'b-blue';
  if(score>=2) return 'b-amber';
  return 'b-red';
}

function fmtIDR(n){
  if(n==null) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}
function fmtDate(s){
  if(!s) return '-';
  const dt = new Date(s);
  if(isNaN(dt)) return s;
  return dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}

// ==========================================================================
// MODULES definition
// ==========================================================================
const MODULES = {

  'master-data': {
    group:'register', title:'Master Data', icon:'database',
    desc:'Fondasi referensi seluruh transaksi: organisasi, lokasi, kategori dan unit kerja.',
    custom:'master-data',
  },

  'bmn-register': {
    group:'register', title:'BMN Register', icon:'box',
    desc:'Register operasional utama seluruh aset BMN fisik, TI, laboratorium dan siber.',
    dataset:'assets', idKey:'asset_id',
    searchKeys:['asset_id','bmn_uid','name','serial','custodian_name','location_label'],
    filters:[
      {key:'category', label:'Kategori'},
      {key:'status', label:'Status'},
      {key:'criticality', label:'Criticality'},
    ],
    columns:[
      {key:'asset_id', label:'Asset ID', cls:'cell-mono'},
      {key:'name', label:'Nama Aset', cls:'cell-strong'},
      {key:'category', label:'Kategori'},
      {key:'location_label', label:'Lokasi'},
      {key:'custodian_name', label:'Custodian'},
      {key:'condition_label', label:'Kondisi', badge:r=>conditionBadge(r.condition_score)},
      {key:'criticality', label:'Criticality', badge:r=>levelBadge(r.criticality)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Aset Terdaftar', value:rows.length, icon:'box', tint:'blue'},
      {label:'Kondisi Baik ke Atas', value: rows.filter(r=>r.condition_score>=4).length, icon:'checkCircle', tint:'green'},
      {label:'Aset Kritis', value: rows.filter(r=>r.criticality==='Critical').length, icon:'alertTriangle', tint:'red'},
      {label:'Sedang Maintenance', value: rows.filter(r=>r.status==='Under Maintenance').length, icon:'wrench', tint:'amber'},
    ],
    detailIsAsset:true,
  },

  'asset-lifecycle': {
    group:'register', title:'Asset Lifecycle', icon:'layers',
    desc:'Perjalanan aset dari planning, akuisisi, penugasan, operasi hingga disposal.',
    custom:'lifecycle',
  },

  'qr-tag': {
    group:'register', title:'QR/Barcode & Asset Tag', icon:'qrcode',
    desc:'Identitas fisik lapangan — generate, cetak dan kelola status tag aset.',
    dataset:'asset_tags', idKey:'tag_id',
    searchKeys:['tag_id','asset_id','bmn_uid','print_batch'],
    filters:[{key:'material', label:'Material'},{key:'status', label:'Status'}],
    columns:[
      {key:'tag_id', label:'Tag ID', cls:'cell-mono'},
      {key:'asset_id', label:'Asset ID', cls:'cell-mono'},
      {key:'material', label:'Material'},
      {key:'print_batch', label:'Batch Cetak'},
      {key:'printed_at', label:'Tgl Cetak', render:r=>fmtDate(r.printed_at)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Tag Diterbitkan', value:rows.length, icon:'qrcode', tint:'blue'},
      {label:'Terpasang', value:rows.filter(r=>r.status==='Terpasang').length, icon:'checkCircle', tint:'green'},
      {label:'Perlu Cetak Ulang', value:rows.filter(r=>r.status==='Cetak Ulang'||r.status==='Rusak').length, icon:'printer', tint:'amber'},
      {label:'Belum Dicetak', value:rows.filter(r=>r.status==='Belum Dicetak').length, icon:'alertCircle', tint:'slate'},
    ],
  },

  'sensus': {
    group:'lapangan', title:'Sensus & Inventarisasi', icon:'clipcheck',
    desc:'Pemeriksaan fisik digital berbasis mobile — scan, kondisi, dan penanganan anomali.',
    custom:'sensus',
  },

  'mutasi': {
    group:'lapangan', title:'Mutasi / IMACD', icon:'shuffle',
    desc:'Kontrol Install, Move, Add, Change dan disposal-related change dengan approval matrix.',
    dataset:'mutasi', idKey:'request_id',
    searchKeys:['request_id','asset_id','asset_name','requestor'],
    filters:[{key:'change_type', label:'Jenis Perubahan'},{key:'status', label:'Status'}],
    columns:[
      {key:'request_id', label:'ID Permintaan', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'change_type', label:'Jenis', badge:r=>'b-blue'},
      {key:'new_location', label:'Lokasi Baru'},
      {key:'requestor', label:'Pemohon'},
      {key:'request_date', label:'Tanggal', render:r=>fmtDate(r.request_date)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Permintaan', value:rows.length, icon:'shuffle', tint:'blue'},
      {label:'Menunggu Persetujuan', value:rows.filter(r=>r.status==='Menunggu Persetujuan').length, icon:'alertCircle', tint:'amber'},
      {label:'Selesai', value:rows.filter(r=>r.status==='Selesai').length, icon:'checkCircle', tint:'green'},
      {label:'Ditolak', value:rows.filter(r=>r.status==='Ditolak').length, icon:'x', tint:'red'},
    ],
  },

  'custodian': {
    group:'lapangan', title:'Custodian Management', icon:'userCheck',
    desc:'Akuntabilitas aset per custodian — assignment, acknowledgement dan return.',
    dataset:'custodians', idKey:'custodian_id',
    searchKeys:['custodian_id','name','unit','nip'],
    filters:[{key:'type', label:'Tipe'},{key:'status', label:'Status'}],
    columns:[
      {key:'custodian_id', label:'ID', cls:'cell-mono'},
      {key:'name', label:'Nama', cls:'cell-strong'},
      {key:'unit', label:'Unit Kerja'},
      {key:'type', label:'Tipe'},
      {key:'asset_count', label:'Jumlah Aset'},
      {key:'phone', label:'Telepon', cls:'cell-muted'},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Custodian', value:rows.length, icon:'userCheck', tint:'blue'},
      {label:'Custodian Aktif', value:rows.filter(r=>r.status==='Aktif').length, icon:'checkCircle', tint:'green'},
      {label:'Rata-rata Aset/Custodian', value: rows.length? Math.round(rows.reduce((a,r)=>a+r.asset_count,0)/rows.length):0, icon:'box', tint:'violet'},
      {label:'Unit Kerja Terdaftar', value: new Set(rows.map(r=>r.unit)).size, icon:'building', tint:'gold'},
    ],
  },

  'jml': {
    group:'lapangan', title:'JML Lifecycle', icon:'users',
    desc:'Joiner–Mover–Leaver: onboarding, transfer dan clearance aset personel.',
    dataset:'jml_events', idKey:'event_id',
    searchKeys:['event_id','person','asset_id'],
    filters:[{key:'event_type', label:'Jenis Event'},{key:'status', label:'Status'}],
    columns:[
      {key:'event_id', label:'ID Event', cls:'cell-mono'},
      {key:'person', label:'Nama', cls:'cell-strong'},
      {key:'event_type', label:'Jenis', badge:r=>({Joiner:'b-green',Mover:'b-blue',Leaver:'b-amber'}[r.event_type]||'b-slate')},
      {key:'asset_id', label:'Asset ID', cls:'cell-mono'},
      {key:'event_date', label:'Tanggal', render:r=>fmtDate(r.event_date)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Event JML', value:rows.length, icon:'users', tint:'blue'},
      {label:'Joiner', value:rows.filter(r=>r.event_type==='Joiner').length, icon:'checkCircle', tint:'green'},
      {label:'Leaver', value:rows.filter(r=>r.event_type==='Leaver').length, icon:'logout', tint:'amber'},
      {label:'Menunggu Proses', value:rows.filter(r=>r.status.startsWith('Menunggu')||r.status==='Proses').length, icon:'alertCircle', tint:'red'},
    ],
  },

  'maintenance': {
    group:'pemeliharaan', title:'Maintenance & Work Order', icon:'wrench',
    desc:'Preventive & corrective maintenance — jadwal, work order, biaya dan downtime.',
    dataset:'work_orders', idKey:'wo_id',
    searchKeys:['wo_id','asset_id','asset_name','technician'],
    filters:[{key:'type', label:'Tipe'},{key:'status', label:'Status'},{key:'priority', label:'Prioritas'}],
    columns:[
      {key:'wo_id', label:'WO ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'type', label:'Tipe', badge:r=>r.type==='Preventive'?'b-blue':'b-violet'},
      {key:'priority', label:'Prioritas', badge:r=>levelBadge(r.priority==='Urgent'?'Critical':r.priority==='High'?'High':r.priority==='Medium'?'Medium':'Low')},
      {key:'technician', label:'Teknisi'},
      {key:'cost', label:'Biaya', render:r=>fmtIDR(r.cost)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Work Order', value:rows.length, icon:'wrench', tint:'blue'},
      {label:'PM Compliance', value: rows.length? Math.round(100*rows.filter(r=>r.type==='Preventive'&&r.status==='Selesai').length/Math.max(1,rows.filter(r=>r.type==='Preventive').length))+'%':'-', icon:'checkCircle', tint:'green'},
      {label:'Overdue', value:rows.filter(r=>r.status==='Overdue').length, icon:'alertTriangle', tint:'red'},
      {label:'Total Biaya (YTD)', value:fmtIDR(rows.reduce((a,r)=>a+r.cost,0)), icon:'dollar', tint:'gold'},
    ],
  },

  'inspection': {
    group:'pemeliharaan', title:'Inspection & Condition', icon:'clipList',
    desc:'Penilaian kondisi berbasis checklist, skor 1–5, temuan dan rekomendasi.',
    dataset:'inspections', idKey:'inspection_id',
    searchKeys:['inspection_id','asset_id','asset_name','inspector'],
    filters:[{key:'recommendation', label:'Rekomendasi'}],
    columns:[
      {key:'inspection_id', label:'ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'inspector', label:'Inspector'},
      {key:'date', label:'Tanggal', render:r=>fmtDate(r.date)},
      {key:'physical_condition', label:'Skor Fisik', render:r=>r.physical_condition+'/5'},
      {key:'finding', label:'Temuan', cls:'cell-muted'},
      {key:'recommendation', label:'Rekomendasi', badge:r=>badgeClassFor('rec', r.recommendation)},
    ],
    kpis:(rows)=>[
      {label:'Total Inspeksi', value:rows.length, icon:'clipList', tint:'blue'},
      {label:'Rata-rata Skor Fisik', value: rows.length? (rows.reduce((a,r)=>a+r.physical_condition,0)/rows.length).toFixed(1):'-', icon:'activity', tint:'green'},
      {label:'Perlu Perbaikan Segera', value:rows.filter(r=>r.recommendation==='Perlu perbaikan segera').length, icon:'alertTriangle', tint:'red'},
      {label:'Rekomendasi Replacement', value:rows.filter(r=>r.recommendation.includes('replacement')).length, icon:'refresh', tint:'amber'},
    ],
  },

  'risk': {
    group:'kinerja', title:'Risk & Criticality', icon:'alertTriangle',
    desc:'Risk register, likelihood × consequence, kontrol dan residual risk.',
    dataset:'risks', idKey:'risk_id',
    searchKeys:['risk_id','asset_id','asset_name','event'],
    filters:[{key:'level', label:'Level Risiko'},{key:'residual', label:'Residual'}],
    columns:[
      {key:'risk_id', label:'ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'event', label:'Peristiwa Risiko'},
      {key:'score', label:'Skor (L×C)', cls:'cell-strong'},
      {key:'level', label:'Level', badge:r=>levelBadge(r.level)},
      {key:'residual', label:'Residual', badge:r=>levelBadge(r.residual)},
      {key:'owner', label:'Owner'},
    ],
    kpis:(rows)=>[
      {label:'Total Risiko Terdaftar', value:rows.length, icon:'alertTriangle', tint:'blue'},
      {label:'Risiko Critical', value:rows.filter(r=>r.level==='Critical').length, icon:'alertCircle', tint:'red'},
      {label:'Risiko High', value:rows.filter(r=>r.level==='High').length, icon:'alertTriangle', tint:'amber'},
      {label:'Residual Rendah', value:rows.filter(r=>r.residual==='Low').length, icon:'checkCircle', tint:'green'},
    ],
  },

  'performance': {
    group:'kinerja', title:'Performance & Asset Health', icon:'activity',
    desc:'Availability, MTBF/MTTR, Asset Health Index (AHI) dan rekomendasi lifecycle.',
    dataset:'asset_kpis', idKey:'kpi_id',
    searchKeys:['kpi_id','asset_id','asset_name'],
    filters:[{key:'decision', label:'Rekomendasi'}],
    columns:[
      {key:'kpi_id', label:'ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'availability', label:'Availability', render:r=>r.availability+'%'},
      {key:'utilization', label:'Utilization', render:r=>r.utilization+'%'},
      {key:'ahi', label:'AHI', cls:'cell-strong', render:r=>r.ahi},
      {key:'decision', label:'Rekomendasi', badge:r=>({KEEP:'b-green',MAINTAIN:'b-blue',REFURBISH:'b-amber',REPLACE:'b-red',DISPOSE:'b-red'}[r.decision]||'b-slate')},
    ],
    kpis:(rows)=>[
      {label:'Rata-rata AHI', value: rows.length? (rows.reduce((a,r)=>a+r.ahi,0)/rows.length).toFixed(1):'-', icon:'activity', tint:'blue'},
      {label:'Direkomendasikan REPLACE', value:rows.filter(r=>r.decision==='REPLACE').length, icon:'refresh', tint:'amber'},
      {label:'Direkomendasikan DISPOSE', value:rows.filter(r=>r.decision==='DISPOSE').length, icon:'trash', tint:'red'},
      {label:'Kondisi KEEP/MAINTAIN', value:rows.filter(r=>r.decision==='KEEP'||r.decision==='MAINTAIN').length, icon:'checkCircle', tint:'green'},
    ],
  },

  'financial': {
    group:'kinerja', title:'Financial & Lifecycle Cost', icon:'dollar',
    desc:'Total Cost of Ownership (TCO) dan Lifecycle Cost (LCC) tanpa menggantikan BoR finansial.',
    dataset:'costs', idKey:'cost_id',
    searchKeys:['cost_id','asset_id','asset_name'],
    filters:[{key:'cost_type', label:'Jenis Biaya'},{key:'period', label:'Periode'}],
    columns:[
      {key:'cost_id', label:'ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'cost_type', label:'Jenis Biaya', badge:r=>'b-blue'},
      {key:'amount', label:'Nominal', cls:'cell-strong', render:r=>fmtIDR(r.amount)},
      {key:'period', label:'Periode'},
      {key:'source', label:'Sumber'},
    ],
    kpis:(rows)=>[
      {label:'Total Biaya Lifecycle', value:fmtIDR(rows.reduce((a,r)=>a+r.amount,0)), icon:'dollar', tint:'blue'},
      {label:'Biaya Maintenance', value:fmtIDR(rows.filter(r=>r.cost_type==='Maintenance').reduce((a,r)=>a+r.amount,0)), icon:'wrench', tint:'amber'},
      {label:'Biaya Acquisition', value:fmtIDR(rows.filter(r=>r.cost_type==='Acquisition').reduce((a,r)=>a+r.amount,0)), icon:'box', tint:'green'},
      {label:'Jumlah Transaksi', value:rows.length, icon:'barChart', tint:'violet'},
    ],
  },

  'reconciliation': {
    group:'bmn', title:'SAKTI/SIMAN Reconciliation', icon:'refresh',
    desc:'Mencocokkan identitas BMN pada sumber resmi dengan data operasional SIMASET.',
    custom:'reconciliation',
  },

  'cyber': {
    group:'siber', title:'Cyber Asset Management', icon:'shield',
    desc:'Kontrol aset siber/kripto — klasifikasi, custodian, otorisasi dan access log.',
    custom:'cyber',
  },

  'sanitization': {
    group:'siber', title:'Media Sanitization', icon:'trash',
    desc:'Sanitasi media sebelum disposal/transfer, mengacu NIST SP 800-88 Rev.2.',
    dataset:'sanitizations', idKey:'sanitization_id',
    searchKeys:['sanitization_id','asset_id','media','certificate_no'],
    filters:[{key:'method', label:'Metode'},{key:'verification', label:'Verifikasi'}],
    columns:[
      {key:'sanitization_id', label:'ID', cls:'cell-mono'},
      {key:'media', label:'Media', cls:'cell-strong'},
      {key:'method', label:'Metode', badge:r=>'b-violet'},
      {key:'operator', label:'Operator'},
      {key:'date', label:'Tanggal', render:r=>fmtDate(r.date)},
      {key:'verification', label:'Verifikasi', badge:r=>badgeClassFor('ver', r.verification)},
    ],
    kpis:(rows)=>[
      {label:'Total Sanitasi', value:rows.length, icon:'trash', tint:'blue'},
      {label:'Lulus Verifikasi', value:rows.filter(r=>r.verification==='Lulus Verifikasi').length, icon:'checkCircle', tint:'green'},
      {label:'Menunggu Verifikasi', value:rows.filter(r=>r.verification==='Menunggu Verifikasi').length, icon:'alertCircle', tint:'amber'},
      {label:'Acuan Standar', value:'NIST 800-88', icon:'fileCheck', tint:'violet'},
    ],
  },

  'disposal': {
    group:'bmn', title:'BMN Disposal', icon:'trash',
    desc:'Akhir lifecycle aset dengan pemisahan technical assessment dan legal disposal.',
    dataset:'disposals', idKey:'disposal_id',
    searchKeys:['disposal_id','asset_id','asset_name'],
    filters:[{key:'method', label:'Metode'},{key:'approval', label:'Status Persetujuan'}],
    columns:[
      {key:'disposal_id', label:'ID', cls:'cell-mono'},
      {key:'asset_name', label:'Aset', cls:'cell-strong'},
      {key:'reason', label:'Alasan'},
      {key:'method', label:'Metode', badge:r=>'b-blue'},
      {key:'date', label:'Tanggal', render:r=>fmtDate(r.date)},
      {key:'approval', label:'Persetujuan', badge:r=>badgeClassFor('appr', r.approval)},
    ],
    kpis:(rows)=>[
      {label:'Total Pengajuan Disposal', value:rows.length, icon:'trash', tint:'blue'},
      {label:'Disetujui', value:rows.filter(r=>r.approval==='Disetujui').length, icon:'checkCircle', tint:'green'},
      {label:'Menunggu Persetujuan', value:rows.filter(r=>r.approval==='Menunggu Persetujuan').length, icon:'alertCircle', tint:'amber'},
      {label:'Metode Lelang', value:rows.filter(r=>r.method==='Lelang').length, icon:'dollar', tint:'gold'},
    ],
  },

  'governance': {
    group:'governance', title:'ISO 55000/55001 Governance', icon:'fileCheck',
    desc:'Policy, objectives, SAMP, Asset Management Plan dan continual improvement.',
    custom:'governance',
  },

  'audit': {
    group:'governance', title:'Audit & Compliance', icon:'search',
    desc:'Audit plan, temuan, root cause, CAPA dan status penutupan.',
    dataset:'audits', idKey:'audit_id',
    searchKeys:['audit_id','scope','finding','pic'],
    filters:[{key:'severity', label:'Severity'},{key:'status', label:'Status'}],
    columns:[
      {key:'audit_id', label:'ID', cls:'cell-mono'},
      {key:'scope', label:'Ruang Lingkup', cls:'cell-strong'},
      {key:'finding', label:'Temuan', cls:'cell-muted'},
      {key:'severity', label:'Severity', badge:r=>({Major:'b-red',Minor:'b-amber',Observation:'b-blue'}[r.severity]||'b-slate')},
      {key:'pic', label:'PIC'},
      {key:'due_date', label:'Jatuh Tempo', render:r=>fmtDate(r.due_date)},
      {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
    ],
    kpis:(rows)=>[
      {label:'Total Temuan', value:rows.length, icon:'search', tint:'blue'},
      {label:'Open', value:rows.filter(r=>r.status==='Open').length, icon:'alertCircle', tint:'red'},
      {label:'Closed', value:rows.filter(r=>r.status==='Closed').length, icon:'checkCircle', tint:'green'},
      {label:'Temuan Berulang', value:rows.filter(r=>r.repeat_finding).length, icon:'refresh', tint:'amber'},
    ],
  },

  'documents': {
    group:'governance', title:'Document Management', icon:'folder',
    desc:'Dokumen terhubung ke aset/transaksi — versioning, expiry alert dan access control.',
    dataset:'documents', idKey:'document_id',
    searchKeys:['document_id','asset_id','asset_name','type'],
    filters:[{key:'type', label:'Jenis Dokumen'}],
    columns:[
      {key:'document_id', label:'ID', cls:'cell-mono'},
      {key:'type', label:'Jenis', badge:r=>'b-blue'},
      {key:'asset_name', label:'Terkait Aset', cls:'cell-strong'},
      {key:'version', label:'Versi'},
      {key:'uploaded_by', label:'Diunggah oleh'},
      {key:'uploaded_at', label:'Tanggal', render:r=>fmtDate(r.uploaded_at)},
      {key:'expiry', label:'Kedaluwarsa', render:r=>r.expiry?fmtDate(r.expiry):'—', badge:r=>r.expiry?'b-amber':'b-slate'},
    ],
    kpis:(rows)=>[
      {label:'Total Dokumen', value:rows.length, icon:'folder', tint:'blue'},
      {label:'Akan/Sudah Kedaluwarsa', value:rows.filter(r=>r.expiry).length, icon:'alertCircle', tint:'amber'},
      {label:'Jenis Dokumen', value:new Set(rows.map(r=>r.type)).size, icon:'layers', tint:'violet'},
      {label:'Diunggah Bulan Ini', value:rows.filter(r=>r.uploaded_at>='2026-08-01').length, icon:'checkCircle', tint:'green'},
    ],
  },

  'reporting': {
    group:'laporan', title:'Reporting & Executive Dashboard', icon:'barChart',
    desc:'Pelaporan register, kondisi, biaya hingga executive KPI dengan ekspor PDF/Excel/CSV.',
    dataset:'reports', idKey:'report_id',
    searchKeys:['report_id','name','unit','category'],
    filters:[{key:'category', label:'Kategori'}],
    columns:[
      {key:'report_id', label:'ID', cls:'cell-mono'},
      {key:'name', label:'Nama Laporan', cls:'cell-strong'},
      {key:'category', label:'Kategori', badge:r=>'b-blue'},
      {key:'period', label:'Periode'},
      {key:'unit', label:'Unit'},
    ],
    kpis:(rows)=>[
      {label:'Laporan Tersedia', value:rows.length, icon:'barChart', tint:'blue'},
      {label:'Kategori Laporan', value:new Set(rows.map(r=>r.category)).size, icon:'layers', tint:'violet'},
      {label:'Format Ekspor', value:'PDF · Excel · CSV', icon:'download', tint:'green'},
      {label:'Update Terakhir', value:'29 Agu 2026', icon:'calendar', tint:'gold'},
    ],
    isReports:true,
  },
};

// Build sidebar nav order (matches Struktur Modul in dokumen, dashboard first)
const NAV_ITEMS = [
  {id:'dashboard', group:'utama', title:'Dashboard Eksekutif', icon:'dashboard'},
  ...Object.keys(MODULES).map(id=>({id, group:MODULES[id].group, title:MODULES[id].title, icon:MODULES[id].icon})),
];
