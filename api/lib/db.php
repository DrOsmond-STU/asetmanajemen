<?php
// Koneksi basis data (PDO) — satu sambungan per permintaan.

function cfg(): array {
  static $cfg = null;
  if($cfg === null){
    $path = __DIR__ . '/../config.php';
    if(!is_file($path)){
      http_response_code(500);
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['error' => 'Aplikasi belum dikonfigurasi: api/config.php tidak ditemukan.'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $cfg = require $path;
  }
  return $cfg;
}

function db(): PDO {
  static $pdo = null;
  if($pdo === null){
    $c = cfg()['db'];
    $dsn = !empty($c['socket'])
      ? sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $c['socket'], $c['name'])
      : sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], (int)($c['port'] ?? 3306), $c['name']);
    try {
      $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Pernyataan disiapkan benar-benar di sisi server, bukan ditiru oleh
        // driver, agar nilai tidak pernah disisipkan ke teks SQL.
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]);
    } catch (PDOException $e) {
      // Pesan asli dapat memuat kredensial — jangan diteruskan ke klien.
      error_log('SIMASET DB: ' . $e->getMessage());
      fail(500, 'Tidak dapat terhubung ke basis data.');
    }
  }
  return $pdo;
}

// Pembungkus kueri singkat.
function q(string $sql, array $params = []): PDOStatement {
  $st = db()->prepare($sql);
  $st->execute($params);
  return $st;
}
function qAll(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function qOne(string $sql, array $params = []): ?array {
  $r = q($sql, $params)->fetch();
  return $r === false ? null : $r;
}
function qVal(string $sql, array $params = []) {
  $r = q($sql, $params)->fetch(PDO::FETCH_NUM);
  return $r === false ? null : $r[0];
}

// Identifier hanya boleh berasal dari daftar putih di datasets.php; fungsi ini
// adalah jaring pengaman terakhir sebelum sebuah nama masuk ke teks SQL.
function ident(string $name): string {
  if(!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name)){
    fail(500, 'Nama kolom tidak sah.');
  }
  return '`' . $name . '`';
}
