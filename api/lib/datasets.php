<?php
// ==========================================================================
// Registry dataset — peta antara nama dataset yang dipakai front-end dan
// tabel basis data, modul RBAC pengampunya, serta pola pembuatan ID.
//
// Tipe dan panjang kolom TIDAK ditulis ulang di sini; semuanya dibaca dari
// information_schema (lihat tableColumns) sehingga validasi tidak mungkin
// menyimpang dari db/schema.sql.
// ==========================================================================

function DATASETS(): array {
  static $d = null;
  if($d !== null) return $d;

  // module  : modul RBAC yang mengatur dataset ini
  // pk      : kolom kunci utama
  // prefix  : pola ID baru; {Y} diganti tahun berjalan. null = AUTO_INCREMENT
  // width   : jumlah digit urutan
  // server  : kolom yang hanya boleh diisi server (abaikan kiriman klien)
  $d = [
    'buildings'     => ['table'=>'buildings',     'pk'=>'id',              'module'=>'master-data',    'prefix'=>'GD-',          'width'=>1],
    'locations'     => ['table'=>'locations',     'pk'=>'location_id',     'module'=>'master-data',    'prefix'=>'LOC-',         'width'=>4],
    'units'         => ['table'=>'units',         'pk'=>'id',              'module'=>'master-data',    'prefix'=>null,           'width'=>0, 'scalar'=>'name'],
    'categories'    => ['table'=>'categories',    'pk'=>'code',            'module'=>'master-data',    'prefix'=>'CAT-',         'width'=>2],
    'custodians'    => ['table'=>'custodians',    'pk'=>'custodian_id',    'module'=>'custodian',      'prefix'=>'CUST-',        'width'=>3],
    'assets'        => ['table'=>'assets',        'pk'=>'asset_id',        'module'=>'bmn-register',   'prefix'=>'AST-{Y}-',     'width'=>6,
                        'server'=>['bmn_uid','satker','kode_barang','nup','category_code','sensitive','condition_label','tag_id','photo']],
    'asset_tags'    => ['table'=>'asset_tags',    'pk'=>'tag_id',          'module'=>'qr-tag',         'prefix'=>'TAG-',         'width'=>6,
                        'server'=>['bmn_uid','qr_payload','printed_at']],
    'sensus_plans'  => ['table'=>'sensus_plans',  'pk'=>'sensus_id',       'module'=>'sensus',         'prefix'=>'SNS-{Y}-',     'width'=>3,
                        'server'=>['scanned_count','anomaly_count']],
    'sensus_items'  => ['table'=>'sensus_items',  'pk'=>'item_id',         'module'=>'sensus',         'prefix'=>'SNSI-',        'width'=>5,
                        'server'=>['asset_name','location_label']],
    'mutasi'        => ['table'=>'mutasi',        'pk'=>'request_id',      'module'=>'mutasi',         'prefix'=>'MUT-{Y}-',     'width'=>4,
                        'server'=>['asset_name','requestor','request_date','old_location','old_custodian']],
    'jml_events'    => ['table'=>'jml_events',    'pk'=>'event_id',        'module'=>'jml',            'prefix'=>'JML-{Y}-',     'width'=>4,
                        'server'=>['event_date']],
    'work_orders'   => ['table'=>'work_orders',   'pk'=>'wo_id',           'module'=>'maintenance',    'prefix'=>'WO-{Y}-',      'width'=>4,
                        'server'=>['asset_name','photo']],
    'inspections'   => ['table'=>'inspections',   'pk'=>'inspection_id',   'module'=>'inspection',     'prefix'=>'INS-{Y}-',     'width'=>4,
                        'server'=>['asset_name','photo']],
    'risks'         => ['table'=>'risks',         'pk'=>'risk_id',         'module'=>'risk',           'prefix'=>'RISK-{Y}-',    'width'=>3,
                        'server'=>['asset_name','score','level']],
    'asset_kpis'    => ['table'=>'asset_kpis',    'pk'=>'kpi_id',          'module'=>'performance',    'prefix'=>'KPI-{Y}-',     'width'=>4,
                        'server'=>['asset_name']],
    'costs'         => ['table'=>'costs',         'pk'=>'cost_id',         'module'=>'financial',      'prefix'=>'COST-{Y}-',    'width'=>5,
                        'server'=>['asset_name']],
    'recon_batches' => ['table'=>'recon_batches', 'pk'=>'batch_id',        'module'=>'reconciliation', 'prefix'=>'RCB-{Y}-',     'width'=>3,
                        'server'=>['total_items','matched','exception']],
    'recon_items'   => ['table'=>'recon_items',   'pk'=>'item_id',         'module'=>'reconciliation', 'prefix'=>'RCI-',         'width'=>5,
                        'server'=>['asset_name']],
    'cyber_assets'  => ['table'=>'cyber_assets',  'pk'=>'cyber_asset_id',  'module'=>'cyber',          'prefix'=>'CYB-{Y}-',     'width'=>3,
                        'server'=>['name','last_access','access_count_30d']],
    'access_logs'   => ['table'=>'access_logs',   'pk'=>'log_id',          'module'=>'cyber',          'prefix'=>'ACC-',         'width'=>5,
                        'server'=>['asset_name','user','timestamp']],
    'sanitizations' => ['table'=>'sanitizations', 'pk'=>'sanitization_id', 'module'=>'sanitization',   'prefix'=>'SAN-{Y}-',     'width'=>3,
                        'server'=>['operator','certificate_no','nist_ref']],
    'disposals'     => ['table'=>'disposals',     'pk'=>'disposal_id',     'module'=>'disposal',       'prefix'=>'DIS-{Y}-',     'width'=>3,
                        'server'=>['asset_name','date']],
    'audits'        => ['table'=>'audits',        'pk'=>'audit_id',        'module'=>'audit',          'prefix'=>'AUD-{Y}-',     'width'=>3,
                        'server'=>['repeat_finding']],
    'documents'     => ['table'=>'documents',     'pk'=>'document_id',     'module'=>'documents',      'prefix'=>'DOC-{Y}-',     'width'=>4,
                        'server'=>['asset_name','uploaded_by','uploaded_at']],
    'reports'       => ['table'=>'reports',       'pk'=>'report_id',       'module'=>'reporting',      'prefix'=>'RPT-',         'width'=>3],
    'users'         => ['table'=>'users',         'pk'=>'user_id',         'module'=>'users',          'prefix'=>'USR-',         'width'=>3,
                        'server'=>['last_login','created_at','password_hash','akun_demo'],
                        // Hash kata sandi tidak boleh keluar dari server dalam
                        // keadaan apa pun, termasuk lewat endpoint baca biasa.
                        'hidden'=>['password_hash']],
    'iot_devices'   => ['table'=>'iot_devices',   'pk'=>'device_id',       'module'=>'iot',            'prefix'=>'IOT-',         'width'=>3,
                        'server'=>['asset_name','last_value','last_seen','battery']],
    'iot_alerts'    => ['table'=>'iot_alerts',    'pk'=>'alert_id',        'module'=>'iot',            'prefix'=>'ALR-{Y}-',     'width'=>3,
                        'server'=>['asset_name','triggered_at']],
    'integrations'  => ['table'=>'integrations',  'pk'=>'id',              'module'=>'integrasi',      'prefix'=>null,           'width'=>0,
                        'server'=>['last_sync','records']],
    'sync_logs'     => ['table'=>'sync_logs',     'pk'=>'log_id',          'module'=>'integrasi',      'prefix'=>'SYN-{Y}-',     'width'=>4,
                        'server'=>['started_at']],
    'approvals'     => ['table'=>'approvals',     'pk'=>'approval_id',     'module'=>'approval',       'prefix'=>'APV-{Y}-',     'width'=>3,
                        'server'=>['requested_by','requested_at','decided_by','decided_at']],

    // Governance dipecah menjadi beberapa tabel; front-end melihatnya sebagai
    // satu objek bersarang (lihat bootstrap).
    'governance.policy'            => ['table'=>'gov_policy',            'pk'=>'id', 'module'=>'governance', 'prefix'=>'POL-',  'width'=>3],
    'governance.objectives'        => ['table'=>'gov_objectives',        'pk'=>'id', 'module'=>'governance', 'prefix'=>'OBJ-',  'width'=>3],
    'governance.samp'              => ['table'=>'gov_samp',              'pk'=>'id', 'module'=>'governance', 'prefix'=>'SAMP-', 'width'=>3],
    'governance.amp'               => ['table'=>'gov_amp',               'pk'=>'id', 'module'=>'governance', 'prefix'=>'AMP-',  'width'=>3],
    'governance.management_review' => ['table'=>'gov_management_review', 'pk'=>'id', 'module'=>'governance', 'prefix'=>'MR-',   'width'=>3],
    'governance.improvement'       => ['table'=>'gov_improvement',       'pk'=>'id', 'module'=>'governance', 'prefix'=>'CI-',   'width'=>3],
  ];
  return $d;
}

function datasetConf(string $name): array {
  $all = DATASETS();
  if(!isset($all[$name])) fail(404, 'Dataset tidak dikenal.');
  return $all[$name] + ['server'=>[], 'scalar'=>null, 'hidden'=>[]];
}

// ---- Introspeksi kolom ----------------------------------------------------
// Dibaca sekali per permintaan dari information_schema; menjadi satu-satunya
// sumber kebenaran tipe dan panjang kolom.
function tableColumns(string $table): array {
  static $cache = [];
  if(isset($cache[$table])) return $cache[$table];
  $rows = qAll(
    "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, EXTRA
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION",
    [$table]
  );
  if(!$rows) fail(500, 'Tabel tidak ditemukan pada basis data: ' . $table);
  $out = [];
  foreach($rows as $r){
    $out[$r['COLUMN_NAME']] = [
      'type'     => $r['DATA_TYPE'],
      'maxlen'   => $r['CHARACTER_MAXIMUM_LENGTH'] !== null ? (int)$r['CHARACTER_MAXIMUM_LENGTH'] : null,
      'nullable' => $r['IS_NULLABLE'] === 'YES',
      'auto'     => stripos((string)$r['EXTRA'], 'auto_increment') !== false,
    ];
  }
  return $cache[$table] = $out;
}

// Daftar modul -> dataset yang dipakai saat memuat data awal.
function MODULE_DATASETS(): array {
  $out = [];
  foreach(DATASETS() as $name => $c){
    $out[$c['module']][] = $name;
  }
  return $out;
}
