<?php
// Menjalankan db/schema.sql pada basis data yang dikonfigurasi di api/config.php.
// Hanya dapat dijalankan dari baris perintah (CLI), bukan lewat HTTP.
declare(strict_types=1);
if(PHP_SAPI !== 'cli'){ http_response_code(403); exit("Hanya dapat dijalankan dari CLI.\n"); }

require_once __DIR__ . '/../api/lib/respond.php';
require_once __DIR__ . '/../api/lib/db.php';

$sql = file_get_contents(__DIR__ . '/schema.sql');
if($sql === false) exit("schema.sql tidak terbaca.\n");

// Pisahkan per pernyataan. schema.sql sengaja tidak memuat ';' di dalam
// literal string sehingga pemisahan sederhana ini aman.
$stmts = array_values(array_filter(array_map('trim', explode(";\n", $sql)), fn($s) => $s !== '' && !preg_match('/^(--|\/\*)/', $s)));

$pdo = db();
$n = 0;
foreach($stmts as $s){
  if(trim($s) === '') continue;
  $pdo->exec($s);
  $n++;
}
$tables = (int)qVal("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()");
printf("Migrasi selesai: %d pernyataan dijalankan, %d tabel tersedia.\n", $n, $tables);
