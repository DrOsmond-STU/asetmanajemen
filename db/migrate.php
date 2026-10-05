<?php
// Menjalankan db/schema.sql pada basis data yang dikonfigurasi di api/config.php.
// Hanya dapat dijalankan dari baris perintah (CLI), bukan lewat HTTP.
declare(strict_types=1);
if(PHP_SAPI !== 'cli'){ http_response_code(403); exit("Hanya dapat dijalankan dari CLI.\n"); }

require_once __DIR__ . '/../api/lib/respond.php';
require_once __DIR__ . '/../api/lib/db.php';

$sql = file_get_contents(__DIR__ . '/schema.sql');
if($sql === false) exit("schema.sql tidak terbaca.\n");

// Buang komentar baris lebih dulu. Tanpa ini, pemecahan per ';' menghasilkan
// potongan yang DIMULAI dengan '--' sehingga pernyataan CREATE TABLE di
// belakangnya ikut terbuang tanpa pesan galat.
$bersih = preg_replace('/^\s*--[^\n]*$/m', '', $sql);

// schema.sql sengaja tidak memuat ';' di dalam literal string, sehingga
// pemecahan sederhana ini aman.
$stmts = array_values(array_filter(
  array_map('trim', explode(';', $bersih)),
  function($s){ return $s !== ''; }
));

$pdo = db();
$dijalankan = 0;
$dibuat = [];
foreach($stmts as $s){
  try {
    $pdo->exec($s);
  } catch (PDOException $e) {
    // Jangan pernah gagal tanpa suara: sebutkan pernyataan yang bermasalah.
    fwrite(STDERR, "GAGAL pada pernyataan #" . ($dijalankan + 1) . ": " . $e->getMessage() . "\n");
    fwrite(STDERR, substr($s, 0, 200) . "\n");
    exit(1);
  }
  $dijalankan++;
  if(preg_match('/CREATE TABLE IF NOT EXISTS `([a-z_]+)`/i', $s, $m)) $dibuat[] = $m[1];
}

$ada = (int)qVal("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()");
$diminta = count($dibuat);
printf("Migrasi: %d pernyataan dijalankan, %d tabel diminta, %d tabel kini ada.\n", $dijalankan, $diminta, $ada);

// Pemeriksaan tegas: setiap tabel yang diminta harus benar-benar ada.
$hilang = [];
foreach($dibuat as $t){
  if((int)qVal("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", [$t]) === 0){
    $hilang[] = $t;
  }
}
if($hilang){
  fwrite(STDERR, "GAGAL: tabel berikut tidak terbentuk: " . implode(', ', $hilang) . "\n");
  exit(1);
}
echo "Seluruh tabel yang diminta terverifikasi ada.\n";
