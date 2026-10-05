<?php
// ==========================================================================
// CRUD generik + validasi masukan.
//
// Prinsip:
//  - Hanya kolom yang ada pada tabel boleh ditulis (daftar putih dari skema).
//  - Kunci utama SELALU dibuat server; nilai kiriman klien diabaikan.
//  - Kolom bertanda 'server' dihitung di sini, bukan dipercayakan ke klien.
//  - Semua nilai masuk melalui pernyataan tersiapkan.
// ==========================================================================

// ---- Konversi nilai sesuai tipe kolom ------------------------------------
function coerce(array $col, $v) {
  // String kosong atau penanda '-' pada kolom tanggal/angka berarti "tidak ada".
  $isBlank = ($v === null || $v === '' || $v === '-');

  switch($col['type']){
    case 'int': case 'bigint': case 'smallint': case 'tinyint': case 'mediumint':
      if($isBlank) return $col['nullable'] ? null : 0;
      if(is_bool($v)) return $v ? 1 : 0;
      if(!is_numeric($v)) return $col['nullable'] ? null : 0;
      return (int)$v;

    case 'decimal': case 'float': case 'double':
      if($isBlank) return $col['nullable'] ? null : 0;
      if(!is_numeric($v)) return $col['nullable'] ? null : 0;
      return (float)$v;

    case 'date':
      if($isBlank) return null;
      $d = date_create((string)$v);
      return $d ? $d->format('Y-m-d') : null;

    case 'datetime': case 'timestamp':
      if($isBlank) return null;
      $d = date_create((string)$v);
      return $d ? $d->format('Y-m-d H:i:s') : null;

    case 'json':
      if($v === null) return null;
      return is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE);

    default: // varchar, char, text
      if($v === null) return $col['nullable'] ? null : '';
      if(is_bool($v))  $v = $v ? 'Ya' : 'Tidak';
      if(is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
      $s = (string)$v;
      if($col['maxlen'] !== null && mb_strlen($s) > $col['maxlen']){
        $s = mb_substr($s, 0, $col['maxlen']);
      }
      return $s;
  }
}

// ---- Daftar putih masukan -------------------------------------------------
// Mengembalikan hanya kolom yang benar-benar ada di tabel dan yang bukan
// milik server. Kunci lain yang dikirim klien dibuang tanpa suara.
function filterInput(string $dataset, array $input, bool $forUpdate): array {
  $conf = datasetConf($dataset);
  $cols = tableColumns($conf['table']);
  $out  = [];
  foreach($input as $k => $v){
    if(!is_string($k) || !isset($cols[$k])) continue;      // kolom tak dikenal
    if($k === $conf['pk']) continue;                        // PK ditentukan server
    if(in_array($k, $conf['server'], true)) continue;       // kolom milik server
    if($cols[$k]['auto']) continue;                         // AUTO_INCREMENT
    $out[$k] = coerce($cols[$k], $v);
  }
  return $out;
}

// ---- Pembuatan ID --------------------------------------------------------
function idPattern(array $conf): string {
  return str_replace('{Y}', date('Y'), (string)$conf['prefix']);
}

// Mengambil urutan tertinggi yang sudah ada untuk pola ID yang sama, lalu
// menambah satu. Benturan tetap mungkin terjadi pada permintaan bersamaan,
// karena itu pemanggil mencoba ulang saat terjadi duplikat kunci.
function nextRecordId(array $conf): string {
  $prefix = idPattern($conf);
  $table  = $conf['table'];
  $pk     = $conf['pk'];
  $max = qVal(
    "SELECT MAX(CAST(SUBSTRING(" . ident($pk) . ", ?) AS UNSIGNED)) FROM " . ident($table) .
    " WHERE " . ident($pk) . " LIKE ?",
    [strlen($prefix) + 1, $prefix . '%']
  );
  $next = ((int)$max) + 1;
  return $prefix . str_pad((string)$next, (int)$conf['width'], '0', STR_PAD_LEFT);
}

// ---- Nilai turunan -------------------------------------------------------
const CONDITION_LABELS = [
  1 => '1 - Rusak Berat', 2 => '2 - Kurang', 3 => '3 - Cukup',
  4 => '4 - Baik', 5 => '5 - Sangat Baik',
];

function assetName(?string $assetId): ?string {
  if(!$assetId || $assetId === '-') return null;
  return qVal("SELECT `name` FROM `assets` WHERE `asset_id` = ?", [$assetId]);
}

// Menghitung kolom yang tidak boleh ditentukan klien. $row diubah di tempat.
function applyDerived(string $dataset, array &$row, array $user, bool $forUpdate, ?array $existing = null): void {
  $today = date('Y-m-d');
  $now   = date('Y-m-d H:i:s');

  switch($dataset){
    case 'assets': {
      $cat = $row['category'] ?? ($existing['category'] ?? null);
      $code = $cat ? qVal("SELECT `code` FROM `categories` WHERE `name` = ?", [$cat]) : null;
      $row['category_code'] = $code ?: 'BMN-UM';
      $row['sensitive']     = ($row['category_code'] === 'CYB') ? 1 : 0;

      if(isset($row['condition_score'])){
        $s = max(1, min(5, (int)$row['condition_score']));
        $row['condition_score'] = $s;
        $row['condition_label'] = CONDITION_LABELS[$s];
      }
      // Lokasi dan custodian: id diturunkan dari label yang dipilih.
      if(isset($row['location_label'])){
        $row['location_id'] = qVal("SELECT `location_id` FROM `locations` WHERE `label` = ?", [$row['location_label']]) ?: null;
      }
      if(isset($row['custodian_name'])){
        $c = qOne("SELECT `custodian_id`,`unit` FROM `custodians` WHERE `name` = ?", [$row['custodian_name']]);
        $row['custodian_id'] = $c['custodian_id'] ?? null;
        $row['unit']         = $c['unit'] ?? null;
      }
      if(!$forUpdate){
        $satker = qVal("SELECT `satker` FROM `assets` ORDER BY `asset_id` LIMIT 1") ?: '677321';
        $seq    = ((int)qVal("SELECT COUNT(*) FROM `assets`")) + 1;
        $row['satker']      = $satker;
        $row['kode_barang'] = '3.9.9.99';
        $row['nup']         = str_pad((string)$seq, 6, '0', STR_PAD_LEFT);
        $row['bmn_uid']     = $satker . '-3.9.9.99-' . $row['nup'];
        $row['risk_level']  = $row['risk_level'] ?? 'Medium';
      }
      break;
    }

    case 'asset_tags': {
      $a = ($row['asset_id'] ?? null) ? qOne("SELECT `bmn_uid` FROM `assets` WHERE `asset_id` = ?", [$row['asset_id']]) : null;
      $row['bmn_uid'] = $a['bmn_uid'] ?? null;
      if(!$forUpdate) $row['printed_at'] = $today;
      break;
    }

    case 'sensus_items':
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      break;

    case 'mutasi': {
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      if(!$forUpdate){
        $a = ($row['asset_id'] ?? null)
          ? qOne("SELECT `location_label`,`custodian_name` FROM `assets` WHERE `asset_id` = ?", [$row['asset_id']])
          : null;
        $row['old_location']  = $a['location_label']  ?? null;
        $row['old_custodian'] = $a['custodian_name'] ?? null;
        $row['requestor']     = $user['name'];
        $row['request_date']  = $today;
      }
      break;
    }

    case 'jml_events':
      if(!$forUpdate) $row['event_date'] = $today;
      break;

    case 'work_orders':
    case 'inspections':
    case 'asset_kpis':
    case 'costs':
    case 'disposals':
    case 'recon_items':
    case 'iot_alerts':
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      if($dataset === 'disposals' && !$forUpdate) $row['date'] = $today;
      if($dataset === 'iot_alerts' && !$forUpdate) $row['triggered_at'] = $now;
      break;

    case 'risks': {
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      $l = max(1, min(5, (int)($row['likelihood']  ?? $existing['likelihood']  ?? 1)));
      $c = max(1, min(5, (int)($row['consequence'] ?? $existing['consequence'] ?? 1)));
      $row['likelihood']  = $l;
      $row['consequence'] = $c;
      $row['score'] = $l * $c;
      $row['level'] = $row['score'] >= 20 ? 'Critical' : ($row['score'] >= 12 ? 'High' : ($row['score'] >= 6 ? 'Medium' : 'Low'));
      break;
    }

    case 'cyber_assets': {
      $row['name'] = assetName($row['asset_id'] ?? null);
      if(!$forUpdate){
        $row['last_access']      = $today;
        $row['access_count_30d'] = 0;
      }
      break;
    }

    case 'access_logs':
      $row['asset_name'] = qVal("SELECT `name` FROM `cyber_assets` WHERE `cyber_asset_id` = ?", [$row['cyber_asset_id'] ?? '']) ?: null;
      if(!$forUpdate){ $row['user'] = $user['name']; $row['timestamp'] = $today; }
      break;

    case 'sanitizations':
      if(!$forUpdate){
        $row['operator'] = $user['name'];
        $seq = ((int)qVal("SELECT COUNT(*) FROM `sanitizations`")) + 1;
        $row['certificate_no'] = 'CERT-SAN-' . date('Y') . '-' . str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        $row['nist_ref'] = 'NIST SP 800-88 Rev.2';
      }
      break;

    case 'audits':
      if(!$forUpdate) $row['repeat_finding'] = 0;
      break;

    case 'documents':
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      if(!$forUpdate){
        $row['uploaded_by'] = $user['name'];
        $row['uploaded_at'] = $today;
      }
      break;

    case 'sensus_plans':
      if(!$forUpdate){ $row['scanned_count'] = 0; $row['anomaly_count'] = 0; }
      break;

    case 'recon_batches':
      if(!$forUpdate){ $row['total_items'] = 0; $row['matched'] = 0; $row['exception'] = 0; }
      break;

    case 'users':
      if(!$forUpdate){
        $row['created_at'] = $today;
        $row['akun_demo']  = 'Tidak';
      }
      break;

    case 'iot_devices':
      $row['asset_name'] = assetName($row['asset_id'] ?? null);
      if(!$forUpdate){
        $row['last_value'] = null;
        $row['last_seen']  = $now;
        $row['battery']    = 100;
      }
      break;

    case 'sync_logs':
      if(!$forUpdate) $row['started_at'] = $now;
      break;

    case 'approvals':
      if(!$forUpdate){
        $row['requested_by'] = $user['name'];
        $row['requested_at'] = $today;
      }
      break;
  }
}

// Memvalidasi dan meng-hash kata sandi dari masukan form.
// $wajibAda = true saat membuat pengguna (boleh kosong -> akun belum dapat
// masuk, sesuai perilaku akun non-demo pada data awal).
function hashPasswordInput(array $input, bool $saatBuat): ?string {
  $p = $input['password'] ?? null;
  if(!is_string($p) || $p === '') return $saatBuat ? null : null;
  if(mb_strlen($p) < 10){
    fail(422, 'Kata sandi minimal 10 karakter.');
  }
  if(mb_strlen($p) > 200){
    fail(422, 'Kata sandi terlalu panjang.');
  }
  return password_hash($p, PASSWORD_DEFAULT);
}

// ---- Operasi -------------------------------------------------------------
function listRecords(string $dataset): array {
  $conf = datasetConf($dataset);
  $rows = qAll("SELECT * FROM " . ident($conf['table']));
  return normalizeRows($dataset, $rows);
}

// Menyesuaikan bentuk baris agar sama seperti yang diharapkan front-end
// (boolean asli, angka asli, array untuk kolom JSON).
function normalizeRows(string $dataset, array $rows): array {
  $conf = datasetConf($dataset);
  $cols = tableColumns($conf['table']);

  // units disimpan sebagai tabel, namun front-end memakainya sebagai array string.
  if($conf['scalar'] !== null){
    return array_map(fn($r) => $r[$conf['scalar']], $rows);
  }

  $boolCols = boolColumns($dataset);
  foreach($rows as &$r){
    foreach($conf['hidden'] as $h) unset($r[$h]);
    foreach($r as $k => $v){
      if($v === null) continue;
      $t = $cols[$k]['type'] ?? 'varchar';
      if(in_array($k, $boolCols, true))                                 $r[$k] = (bool)(int)$v;
      elseif(in_array($t, ['int','bigint','smallint','mediumint','tinyint'], true)) $r[$k] = (int)$v;
      elseif(in_array($t, ['decimal','float','double'], true))           $r[$k] = (float)$v;
      elseif($t === 'json')                                              $r[$k] = json_decode($v, true);
      elseif($t === 'datetime' || $t === 'timestamp')                    $r[$k] = substr($v, 0, 16);
    }
  }
  return $rows;
}

// Kolom yang harus dikembalikan sebagai boolean, sesuai data purwarupa.
function boolColumns(string $dataset): array {
  switch($dataset){
    case 'assets': return ['sensitive'];
    case 'audits': return ['repeat_finding'];
    default:       return [];
  }
}

function findRecord(string $dataset, string $id): ?array {
  $conf = datasetConf($dataset);
  return qOne("SELECT * FROM " . ident($conf['table']) . " WHERE " . ident($conf['pk']) . " = ?", [$id]);
}

function createRecord(string $dataset, array $input, array $user): array {
  $conf = datasetConf($dataset);
  $cols = tableColumns($conf['table']);

  $row = filterInput($dataset, $input, false);
  applyDerived($dataset, $row, $user, false);
  // Foto masuk lewat jalur tersendiri: diperiksa dan disandikan ulang oleh
  // photos.php, lalu yang tersimpan di basis data hanyalah jalur berkasnya.
  if(isset($cols['photo']) && array_key_exists('photo', $input)){
    $row['photo'] = storePhotoDataUri(is_string($input['photo']) ? $input['photo'] : null);
  }
  // Kata sandi di-hash di server; nilai teks biasa tidak pernah disimpan.
  if($dataset === 'users'){
    $row['password_hash'] = hashPasswordInput($input, true);
  }

  // Buang kembali apa pun yang bukan kolom nyata setelah penurunan nilai.
  foreach(array_keys($row) as $k){
    if(!isset($cols[$k]) || $cols[$k]['auto']){ unset($row[$k]); continue; }
    $row[$k] = coerce($cols[$k], $row[$k]);
  }
  if(!$row) fail(422, 'Tidak ada kolom yang dapat disimpan.');

  $auto = $cols[$conf['pk']]['auto'] ?? false;
  $attempts = $auto ? 1 : 5;

  for($i = 0; $i < $attempts; $i++){
    $toInsert = $row;
    if(!$auto) $toInsert[$conf['pk']] = nextRecordId($conf);
    $names  = array_map('ident', array_keys($toInsert));
    $holders = implode(',', array_fill(0, count($toInsert), '?'));
    try {
      q("INSERT INTO " . ident($conf['table']) . " (" . implode(',', $names) . ") VALUES ($holders)",
        array_values($toInsert));
      $id = $auto ? (string)db()->lastInsertId() : $toInsert[$conf['pk']];
      auditLog('create', $dataset, $id);
      afterCreate($dataset, $id, $toInsert, $user);
      return findRecord($dataset, $id) ?? $toInsert;
    } catch (PDOException $e) {
      // 23000 = pelanggaran batasan keunikan. Pada pembuatan ID, coba lagi.
      if($e->getCode() === '23000' && !$auto && $i < $attempts - 1) continue;
      if($e->getCode() === '23000') fail(409, 'Data dengan kunci yang sama sudah ada.');
      error_log('SIMASET insert ' . $dataset . ': ' . $e->getMessage());
      fail(500, 'Gagal menyimpan data.');
    }
  }
  fail(500, 'Gagal membuat nomor identitas baru.');
}

// Efek samping setelah pembuatan, meniru perilaku purwarupa.
function afterCreate(string $dataset, string $id, array $row, array $user): void {
  // Batch rekonsiliasi baru langsung diisi item pembanding, meniru hasil
  // pembacaan berkas ekspor SAKTI/SIMAN. Pencocokannya disimulasikan.
  if($dataset === 'recon_batches'){
    $assets = qAll("SELECT `bmn_uid`,`name` FROM `assets` ORDER BY RAND() LIMIT 10");
    $itemConf = datasetConf('recon_items');
    $cocok = 0;
    $sebab = ['Unmatched','Mismatch','Duplicate','Missing'];
    foreach($assets as $a){
      $isMatch = random_int(0, 99) >= 25;
      if($isMatch) $cocok++;
      for($t = 0; $t < 5; $t++){
        try {
          q("INSERT INTO `recon_items` (`item_id`,`batch_id`,`bmn_uid`,`asset_name`,`match_status`,`exception_note`)
             VALUES (?,?,?,?,?,?)",
            [nextRecordId($itemConf), $id, $a['bmn_uid'], $a['name'],
             $isMatch ? 'Matched' : $sebab[random_int(0, 3)],
             $isMatch ? null : 'Perlu verifikasi lanjutan']);
          break;
        } catch (PDOException $e) {
          if($e->getCode() !== '23000') throw $e;
        }
      }
    }
    q("UPDATE `recon_batches` SET `total_items` = ?, `matched` = ?, `exception` = ? WHERE `batch_id` = ?",
      [count($assets), $cocok, count($assets) - $cocok, $id]);
    auditLog('create', 'recon_items', $id, count($assets) . ' item dibuat otomatis');
    return;
  }

  if($dataset === 'assets'){
    // Setiap aset baru otomatis mendapat tag QR/Barcode.
    $tagConf = datasetConf('asset_tags');
    for($i = 0; $i < 5; $i++){
      $tagId = nextRecordId($tagConf);
      try {
        q("INSERT INTO `asset_tags` (`tag_id`,`asset_id`,`bmn_uid`,`qr_payload`,`material`,`print_batch`,`status`,`printed_at`)
           VALUES (?,?,?,?,?,?,?,?)",
          [$tagId, $id, $row['bmn_uid'] ?? null,
           'https://simaset.semestateknologiutama.com/t/' . $tagId,
           'Standard PVC', 'BATCH-BARU', 'Belum Dicetak', date('Y-m-d')]);
        q("UPDATE `assets` SET `tag_id` = ? WHERE `asset_id` = ?", [$tagId, $id]);
        auditLog('create', 'asset_tags', $tagId, 'otomatis dari aset ' . $id);
        return;
      } catch (PDOException $e) {
        if($e->getCode() !== '23000') throw $e;
      }
    }
  }
}

function updateRecord(string $dataset, string $id, array $input, array $user): array {
  $conf = datasetConf($dataset);
  $cols = tableColumns($conf['table']);
  $existing = findRecord($dataset, $id);
  if(!$existing) fail(404, 'Data tidak ditemukan.');

  $row = filterInput($dataset, $input, true);
  applyDerived($dataset, $row, $user, true, $existing);
  if($dataset === 'users'){
    // Kolom hanya diubah bila kata sandi baru benar-benar diisi, agar
    // menyunting data lain tidak menghapus kata sandi yang sudah ada.
    $h = hashPasswordInput($input, false);
    if($h !== null) $row['password_hash'] = $h;
  }
  if(isset($cols['photo']) && array_key_exists('photo', $input)){
    $baru = storePhotoDataUri(is_string($input['photo']) ? $input['photo'] : null);
    // Berkas lama dibuang hanya bila benar-benar diganti, agar tidak ada
    // foto tak bertuan yang menumpuk di direktori unggahan.
    if(($existing['photo'] ?? null) !== $baru) deletePhotoFile($existing['photo'] ?? null);
    $row['photo'] = $baru;
  }

  foreach(array_keys($row) as $k){
    if(!isset($cols[$k]) || $cols[$k]['auto'] || $k === $conf['pk']){ unset($row[$k]); continue; }
    $row[$k] = coerce($cols[$k], $row[$k]);
  }
  if(!$row) fail(422, 'Tidak ada perubahan yang dapat disimpan.');

  $sets = implode(',', array_map(fn($k) => ident($k) . ' = ?', array_keys($row)));
  $params = array_values($row);
  $params[] = $id;
  try {
    q("UPDATE " . ident($conf['table']) . " SET $sets WHERE " . ident($conf['pk']) . " = ?", $params);
  } catch (PDOException $e) {
    if($e->getCode() === '23000') fail(409, 'Nilai tersebut sudah dipakai oleh data lain.');
    error_log('SIMASET update ' . $dataset . ': ' . $e->getMessage());
    fail(500, 'Gagal memperbarui data.');
  }
  auditLog('update', $dataset, $id, array_keys($row));
  return findRecord($dataset, $id) ?? [];
}

function deleteRecord(string $dataset, string $id, array $user): void {
  $conf = datasetConf($dataset);
  if(!findRecord($dataset, $id)) fail(404, 'Data tidak ditemukan.');

  // Pengguna tidak boleh menghapus akunnya sendiri.
  if($dataset === 'users' && $id === ($user['user_id'] ?? null)){
    fail(422, 'Anda tidak dapat menghapus akun yang sedang digunakan.');
  }
  $lama = findRecord($dataset, $id);
  try {
    q("DELETE FROM " . ident($conf['table']) . " WHERE " . ident($conf['pk']) . " = ?", [$id]);
  } catch (PDOException $e) {
    error_log('SIMASET delete ' . $dataset . ': ' . $e->getMessage());
    fail(500, 'Gagal menghapus data.');
  }
  deletePhotoFile($lama['photo'] ?? null);
  // Tag mengikuti asetnya.
  if($dataset === 'assets'){
    q("DELETE FROM `asset_tags` WHERE `asset_id` = ?", [$id]);
  }
  auditLog('delete', $dataset, $id);
}
