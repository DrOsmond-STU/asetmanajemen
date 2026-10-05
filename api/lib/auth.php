<?php
// Autentikasi berbasis sesi server, perlindungan CSRF, dan jejak audit.

function startSession(): void {
  if(session_status() === PHP_SESSION_ACTIVE) return;
  $secure = (bool)(cfg()['secure_cookies'] ?? true);
  // Di server aplikasi selalu dilayani lewat HTTPS; saat uji lokal (HTTP)
  // nilai ini dimatikan lewat config agar cookie tetap terkirim.
  session_name('SIMASETSID');
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,            // tidak dapat dibaca JavaScript
    'secure'   => $secure,
    'samesite' => 'Lax',           // tidak dikirim pada permintaan lintas situs
  ]);
  session_start();
}

function currentUser(): ?array {
  startSession();
  return $_SESSION['user'] ?? null;
}

function requireLogin(): array {
  $u = currentUser();
  if(!$u) fail(401, 'Sesi Anda sudah berakhir. Silakan masuk kembali.');
  return $u;
}

// ---- CSRF -----------------------------------------------------------------
function csrfToken(): string {
  startSession();
  if(empty($_SESSION['csrf'])){
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf'];
}

// Setiap permintaan yang mengubah keadaan wajib menyertakan token sesi pada
// header. Cookie SameSite=Lax saja belum cukup untuk permintaan POST dari
// formulir pihak ketiga pada peramban lama.
function requireCsrf(): void {
  startSession();
  $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  $have = $_SESSION['csrf'] ?? '';
  if($have === '' || !is_string($sent) || !hash_equals($have, $sent)){
    fail(419, 'Token keamanan tidak sah atau sudah kedaluwarsa. Muat ulang halaman.');
  }
}

// ---- Pembatasan percobaan masuk ------------------------------------------
const LOGIN_WINDOW_MIN   = 15;
const LOGIN_MAX_PER_IP    = 20;
const LOGIN_MAX_PER_EMAIL = 6;

function loginThrottled(string $email, string $ip): bool {
  $since = (new DateTimeImmutable("-" . LOGIN_WINDOW_MIN . " minutes"))->format('Y-m-d H:i:s');
  $byIp = (int)qVal(
    "SELECT COUNT(*) FROM `login_attempts` WHERE `ip` = ? AND `ok` = 0 AND `at` >= ?", [$ip, $since]);
  if($byIp >= LOGIN_MAX_PER_IP) return true;
  $byEmail = (int)qVal(
    "SELECT COUNT(*) FROM `login_attempts` WHERE `email` = ? AND `ok` = 0 AND `at` >= ?", [$email, $since]);
  return $byEmail >= LOGIN_MAX_PER_EMAIL;
}

function recordLoginAttempt(string $email, string $ip, bool $okFlag): void {
  q("INSERT INTO `login_attempts` (`email`,`ip`,`at`,`ok`) VALUES (?,?,NOW(),?)",
    [mb_substr($email, 0, 190), $ip, $okFlag ? 1 : 0]);
}

// ---- Jejak audit ----------------------------------------------------------
function auditLog(string $action, ?string $dataset, ?string $recordId, $detail = null): void {
  $u = currentUser();
  try {
    q("INSERT INTO `audit_log` (`at`,`user_id`,`user_email`,`role`,`action`,`dataset`,`record_id`,`ip`,`detail`)
       VALUES (NOW(),?,?,?,?,?,?,?,?)", [
      $u['user_id'] ?? null,
      $u['email']   ?? null,
      $u['role']    ?? null,
      mb_substr($action, 0, 32),
      $dataset !== null ? mb_substr($dataset, 0, 64) : null,
      $recordId !== null ? mb_substr((string)$recordId, 0, 64) : null,
      clientIp(),
      $detail === null ? null : mb_substr(is_string($detail) ? $detail : json_encode($detail, JSON_UNESCAPED_UNICODE), 0, 4000),
    ]);
  } catch (Throwable $e) {
    // Kegagalan pencatatan tidak boleh menggagalkan permintaan pengguna.
    error_log('SIMASET audit: ' . $e->getMessage());
  }
}

// Bentuk data pengguna yang boleh dikirim ke peramban — tanpa hash kata sandi.
function publicUser(array $row): array {
  return [
    'user_id' => $row['user_id'],
    'name'    => $row['name'],
    'email'   => $row['email'],
    'role'    => $row['role'],
    'unit'    => $row['unit'] ?? null,
    'nip'     => $row['nip'] ?? null,
  ];
}
