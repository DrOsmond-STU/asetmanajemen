<?php
// ==========================================================================
// SIMASET BMN — API (front controller)
// --------------------------------------------------------------------------
// Semua permintaan /api/* diarahkan ke berkas ini oleh api/.htaccess.
// ==========================================================================

declare(strict_types=1);

require_once __DIR__ . '/lib/respond.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/rbac.php';
require_once __DIR__ . '/lib/datasets.php';
require_once __DIR__ . '/lib/records.php';
require_once __DIR__ . '/lib/photos.php';

$debug = (bool)(cfg()['debug'] ?? false);
error_reporting($debug ? E_ALL : 0);
ini_set('display_errors', $debug ? '1' : '0');

set_exception_handler(function(Throwable $e) use ($debug) {
  error_log('SIMASET: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  fail(500, $debug ? ($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine()) : 'Terjadi kesalahan pada server.');
});

// Tidak ada permintaan lintas asal: front-end dilayani dari domain yang sama.
header('Vary: Cookie');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path   = trim((string)($_GET['_route'] ?? ''), '/');
if($path === ''){
  // Cadangan bila rewrite tidak aktif: /api/index.php/auth/me
  $path = trim((string)($_SERVER['PATH_INFO'] ?? ''), '/');
}
$seg = $path === '' ? [] : explode('/', $path);

// Permintaan yang mengubah keadaan wajib membawa token CSRF.
if(in_array($method, ['POST','PUT','PATCH','DELETE'], true)){
  // Pengecualian: login belum punya sesi, dilindungi pembatasan percobaan.
  if(!($seg[0] === 'auth' && ($seg[1] ?? '') === 'login')){
    requireCsrf();
  }
}

switch($seg[0] ?? ''){

  // ---- Status ------------------------------------------------------------
  case 'health':
    ok(['status' => 'ok', 'db' => (int)qVal('SELECT 1') === 1, 'time' => date('c')]);

  // ---- Autentikasi -------------------------------------------------------
  case 'auth':
    switch($seg[1] ?? ''){

      case 'login': {
        if($method !== 'POST') fail(405, 'Metode tidak diizinkan.');
        $b     = body();
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $pass  = (string)($b['password'] ?? '');
        $ip    = clientIp();

        if($email === '' || $pass === '') fail(422, 'Email dan kata sandi wajib diisi.');

        if(loginThrottled($email, $ip)){
          auditLog('login_throttled', null, null, $email);
          fail(429, 'Terlalu banyak percobaan masuk. Coba lagi dalam ' . LOGIN_WINDOW_MIN . ' menit.');
        }

        $u = qOne("SELECT * FROM `users` WHERE `email` = ?", [$email]);
        // Kata sandi selalu diperiksa, bahkan saat pengguna tidak ada, agar
        // waktu tanggapan tidak membocorkan email mana yang terdaftar.
        $hash = $u['password_hash'] ?? '$2y$12$' . str_repeat('x', 53);
        $good = password_verify($pass, $hash);

        if(!$u || !$good || ($u['status'] ?? '') !== 'Aktif'){
          recordLoginAttempt($email, $ip, false);
          auditLog('login_failed', null, null, $email);
          // Pesan yang sama untuk semua sebab — jangan ungkap akun mana yang ada.
          fail(401, 'Email atau kata sandi tidak dikenali.');
        }

        recordLoginAttempt($email, $ip, true);
        startSession();
        session_regenerate_id(true);          // cegah session fixation
        $_SESSION['user'] = publicUser($u);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        q("UPDATE `users` SET `last_login` = NOW() WHERE `user_id` = ?", [$u['user_id']]);
        auditLog('login', null, null, null);

        ok(null, ['user' => $_SESSION['user'], 'csrf' => $_SESSION['csrf']]);
      }

      case 'logout': {
        if($method !== 'POST') fail(405, 'Metode tidak diizinkan.');
        auditLog('logout', null, null, null);
        startSession();
        $_SESSION = [];
        if(ini_get('session.use_cookies')){
          $p = session_get_cookie_params();
          setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        ok(['loggedOut' => true]);
      }

      case 'me': {
        $u = currentUser();
        if(!$u) fail(401, 'Belum masuk.');
        ok(null, ['user' => $u, 'csrf' => csrfToken()]);
      }
    }
    fail(404, 'Rute autentikasi tidak dikenal.');

  // ---- Muat data awal ----------------------------------------------------
  case 'bootstrap': {
    $u    = requireLogin();
    $role = $u['role'];
    $out  = [
      'org'          => qVal("SELECT `v` FROM `app_meta` WHERE `k` = 'org'") ?? '',
      'generated_at' => qVal("SELECT `v` FROM `app_meta` WHERE `k` = 'generated_at'") ?? date('Y-m-d'),
    ];

    // Setiap dataset ada sebagai kunci agar front-end tidak perlu memeriksa
    // keberadaannya; yang tidak boleh dibaca peran ini tetap kosong.
    $governance = [];
    $denied     = [];
    foreach(DATASETS() as $name => $conf){
      $allowed = rbacCanRead($role, $conf['module']);
      $rows    = $allowed ? listRecords($name) : [];
      if(!$allowed) $denied[] = $name;

      if(strncmp($name, 'governance.', 11) === 0){
        $governance[substr($name, strlen('governance.'))] = $rows;
      } else {
        $out[$name] = $rows;
      }
    }
    $out['governance'] = $governance;

    ok(null, [
      'data'      => $out,
      'user'      => $u,
      'csrf'      => csrfToken(),
      'access'    => ['role' => $role, 'modules' => rbacAllowedModules($role)],
      // Dataset yang dikosongkan karena hak akses — dipakai front-end untuk
      // menampilkan "tidak tersedia" alih-alih angka nol yang menyesatkan.
      'restricted' => $denied,
      'uploadDir'  => uploadRelative(),
    ]);
  }

  // ---- CRUD --------------------------------------------------------------
  case 'records': {
    $u       = requireLogin();
    $dataset = $seg[1] ?? '';
    if($dataset === '') fail(422, 'Dataset tidak disebutkan.');
    $conf = datasetConf($dataset);
    $id   = isset($seg[2]) ? urldecode($seg[2]) : null;

    switch($method){
      case 'GET':
        requireRead($conf['module']);
        if($id !== null){
          $r = findRecord($dataset, $id);
          if(!$r) fail(404, 'Data tidak ditemukan.');
          ok(normalizeRows($dataset, [$r])[0]);
        }
        ok(listRecords($dataset));

      case 'POST':
        requireWrite($conf['module']);
        ok(normalizeRows($dataset, [createRecord($dataset, body(), $u)])[0]);

      case 'PUT': case 'PATCH':
        requireWrite($conf['module']);
        if($id === null) fail(422, 'Identitas data tidak disebutkan.');
        ok(normalizeRows($dataset, [updateRecord($dataset, $id, body(), $u)])[0]);

      case 'DELETE':
        requireWrite($conf['module']);
        if($id === null) fail(422, 'Identitas data tidak disebutkan.');
        deleteRecord($dataset, $id, $u);
        ok(['deleted' => $id]);
    }
    fail(405, 'Metode tidak diizinkan.');
  }

  // ---- Keputusan persetujuan --------------------------------------------
  case 'approvals': {
    $u  = requireLogin();
    $id = $seg[1] ?? '';
    if($method !== 'POST' || ($seg[2] ?? '') !== 'decide') fail(404, 'Rute tidak dikenal.');

    $apv = findRecord('approvals', $id);
    if(!$apv) fail(404, 'Permintaan persetujuan tidak ditemukan.');

    // Kewenangan menyetujui diperiksa pada modul yang diampu permintaan ini,
    // bukan hanya pada modul 'approval'.
    $modul = (string)($apv['modul'] ?? 'approval');
    if(!rbacCanApprove($u['role'], 'approval') || !rbacCanApprove($u['role'], $modul)){
      auditLog('denied', 'approvals', $id, 'persetujuan ditolak untuk modul ' . $modul);
      fail(403, 'Peran Anda tidak berwenang memutuskan permintaan ini.');
    }
    // Peran yang diminta pada data juga harus cocok.
    if(!empty($apv['role_required']) && $apv['role_required'] !== $u['role']){
      fail(403, 'Permintaan ini menunggu keputusan peran ' . $apv['role_required'] . '.');
    }
    if(($apv['status'] ?? '') !== 'Menunggu'){
      fail(409, 'Permintaan ini sudah diputuskan sebelumnya.');
    }

    $decision = (string)(body()['status'] ?? '');
    if(!in_array($decision, ['Disetujui', 'Ditolak'], true)){
      fail(422, 'Keputusan harus "Disetujui" atau "Ditolak".');
    }
    q("UPDATE `approvals` SET `status` = ?, `decided_by` = ?, `decided_at` = NOW() WHERE `approval_id` = ?",
      [$decision, $u['role'], $id]);
    auditLog('approve', 'approvals', $id, $decision);
    ok(normalizeRows('approvals', [findRecord('approvals', $id)])[0]);
  }

  // ---- Jejak audit (hanya peran dengan akses modul audit) ----------------
  case 'audit-log': {
    requireLogin();
    requireRead('audit');
    $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
    ok(qAll("SELECT `at`,`user_email`,`role`,`action`,`dataset`,`record_id`,`ip`
               FROM `audit_log` ORDER BY `id` DESC LIMIT $limit"));
  }
}

fail(404, 'Rute tidak dikenal.');
