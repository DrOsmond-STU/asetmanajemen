<?php
// ==========================================================================
// Mengisi basis data dari db/seed-data.json (hasil ekspor data purwarupa).
//
//   php db/seed.php           -> hanya mengisi tabel yang masih kosong
//   php db/seed.php --force   -> MENGOSONGKAN tabel data lalu mengisi ulang
//
// Hanya dapat dijalankan dari CLI. Kata sandi akun demo di-hash di sini;
// tidak ada kata sandi berbentuk teks biasa yang masuk ke basis data.
// ==========================================================================
declare(strict_types=1);
if(PHP_SAPI !== 'cli'){ http_response_code(403); exit("Hanya dapat dijalankan dari CLI.\n"); }

require_once __DIR__ . '/../api/lib/respond.php';
require_once __DIR__ . '/../api/lib/db.php';
require_once __DIR__ . '/../api/lib/datasets.php';
require_once __DIR__ . '/../api/lib/records.php';

$force = in_array('--force', $argv, true);

$json = file_get_contents(__DIR__ . '/seed-data.json');
if($json === false) exit("seed-data.json tidak terbaca. Jalankan: node db/export-seed.js\n");
$D = json_decode($json, true);
if(!is_array($D)) exit("seed-data.json tidak valid.\n");

$pdo = db();

// Kata sandi akun demo. Hanya akun bertanda akun_demo = "Ya" yang mendapat
// kata sandi; akun lain tidak dapat masuk sampai kata sandinya ditetapkan.
const DEMO_PASSWORD = 'simaset123';

// Urutan pengisian: master data lebih dulu agar nilai turunan konsisten.
$order = [
  'buildings','locations','units','categories','custodians',
  'assets','asset_tags',
  'sensus_plans','sensus_items','mutasi','jml_events',
  'work_orders','inspections','risks','asset_kpis','costs',
  'recon_batches','recon_items',
  'cyber_assets','access_logs','sanitizations','disposals',
  'audits','documents','reports','users',
  'iot_devices','iot_alerts','integrations','sync_logs','approvals',
  'governance.policy','governance.objectives','governance.samp',
  'governance.amp','governance.management_review','governance.improvement',
];

// Nilai dataset: mendukung jalur bertitik seperti governance.improvement.
function seedRows(array $D, string $name): array {
  $parts = explode('.', $name);
  $v = $D;
  foreach($parts as $p){
    if(!is_array($v) || !array_key_exists($p, $v)) return [];
    $v = $v[$p];
  }
  return is_array($v) ? $v : [];
}

if($force){
  fwrite(STDERR, "--force: mengosongkan seluruh tabel data terlebih dahulu.\n");
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
  foreach(array_reverse($order) as $name){
    $pdo->exec('TRUNCATE TABLE ' . ident(datasetConf($name)['table']));
  }
  $pdo->exec('TRUNCATE TABLE `app_meta`');
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

// ---- Metadata -------------------------------------------------------------
foreach(['org','generated_at'] as $k){
  if(isset($D[$k]) && is_string($D[$k])){
    q("INSERT INTO `app_meta` (`k`,`v`) VALUES (?,?) ON DUPLICATE KEY UPDATE `v` = VALUES(`v`)", [$k, $D[$k]]);
  }
}

$total = 0; $dilewati = 0;
$hash = password_hash(DEMO_PASSWORD, PASSWORD_DEFAULT);

foreach($order as $name){
  $conf  = datasetConf($name);
  $table = $conf['table'];
  $cols  = tableColumns($table);
  $rows  = seedRows($D, $name);

  if(!$rows){ printf("  %-30s tidak ada data di seed\n", $name); continue; }

  $ada = (int)qVal('SELECT COUNT(*) FROM ' . ident($table));
  if($ada > 0 && !$force){
    printf("  %-30s dilewati (sudah ada %d baris)\n", $name, $ada);
    $dilewati++;
    continue;
  }

  $n = 0;
  foreach($rows as $r){
    // units adalah array string; dibungkus menjadi baris bernama.
    if($conf['scalar'] !== null && !is_array($r)) $r = [$conf['scalar'] => $r];
    if(!is_array($r)) continue;

    // Kata sandi akun demo.
    if($name === 'users'){
      $r['password_hash'] = (($r['akun_demo'] ?? 'Tidak') === 'Ya') ? $hash : null;
    }

    $vals = [];
    foreach($r as $k => $v){
      if(!isset($cols[$k]) || $cols[$k]['auto']) continue;
      $vals[$k] = coerce($cols[$k], $v);
    }
    if(!$vals) continue;

    $names   = implode(',', array_map('ident', array_keys($vals)));
    $holders = implode(',', array_fill(0, count($vals), '?'));
    q("INSERT INTO " . ident($table) . " ($names) VALUES ($holders)", array_values($vals));
    $n++;
  }
  printf("  %-30s %4d baris\n", $name, $n);
  $total += $n;
}

printf("\nSelesai: %d baris dimasukkan, %d dataset dilewati.\n", $total, $dilewati);
$aktifDemo = (int)qVal("SELECT COUNT(*) FROM `users` WHERE `password_hash` IS NOT NULL");
printf("Akun yang dapat masuk: %d (kata sandi demo: %s)\n", $aktifDemo, DEMO_PASSWORD);
