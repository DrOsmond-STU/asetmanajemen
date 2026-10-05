<?php
// Respons JSON dan penanganan galat.

function jsonOut($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function ok($data = null, array $extra = []): void {
  jsonOut(array_merge(['ok' => true], $data === null ? [] : ['data' => $data], $extra));
}

function fail(int $code, string $message, array $extra = []): void {
  jsonOut(array_merge(['ok' => false, 'error' => $message], $extra), $code);
}

// Badan permintaan JSON.
function body(): array {
  static $b = null;
  if($b === null){
    $raw = file_get_contents('php://input');
    if($raw === '' || $raw === false){ $b = []; }
    else {
      $d = json_decode($raw, true);
      $b = is_array($d) ? $d : [];
    }
  }
  return $b;
}

function clientIp(): string {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  return substr((string)$ip, 0, 64);
}
