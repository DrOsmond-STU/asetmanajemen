<?php
// ==========================================================================
// Penyimpanan foto.
//
// Foto dikirim peramban sebagai data URI (sudah dikompres di sisi klien),
// lalu di server: diperiksa jenisnya, DIBACA ULANG dan DISANDIKAN ULANG oleh
// GD, baru disimpan sebagai berkas. Penyandian ulang membuang seluruh
// metadata (termasuk koordinat GPS pada EXIF) dan memastikan berkas yang
// tersimpan benar-benar gambar, bukan skrip berkedok gambar.
// ==========================================================================

const PHOTO_MIME = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
];

function uploadRoot(): string {
  // Direktori unggahan berada di luar api/ dan di dalam akar dokumen.
  return dirname(__DIR__, 2) . '/' . trim((string)(cfg()['upload_dir'] ?? 'uploads/photos'), '/');
}
function uploadRelative(): string {
  return trim((string)(cfg()['upload_dir'] ?? 'uploads/photos'), '/');
}

function ensureUploadDir(): string {
  $dir = uploadRoot();
  if(!is_dir($dir)){
    if(!@mkdir($dir, 0755, true) && !is_dir($dir)){
      fail(500, 'Direktori penyimpanan foto tidak dapat dibuat.');
    }
  }
  // Cegah eksekusi apa pun di dalam direktori unggahan, berlapis dengan
  // aturan pada .htaccess akar.
  $guard = $dir . '/.htaccess';
  if(!is_file($guard)){
    @file_put_contents($guard, implode("\n", [
      '# Direktori ini hanya boleh menyajikan gambar statis.',
      'php_flag engine off',
      'RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phps',
      'RemoveType .php .phtml .php3 .php4 .php5 .php7 .php8 .phps',
      '<FilesMatch "\.(?i:php[0-9]?|phtml|phps|pl|py|cgi|sh|htaccess)$">',
      '  Require all denied',
      '</FilesMatch>',
      '',
    ]));
  }
  return $dir;
}

// Menyimpan satu data URI gambar dan mengembalikan jalur relatifnya,
// mis. "uploads/photos/9f2c….jpg". Mengembalikan null bila masukan kosong.
function storePhotoDataUri(?string $dataUri): ?string {
  if($dataUri === null || $dataUri === '' || $dataUri === '-') return null;

  // Jalur relatif yang sudah tersimpan sebelumnya — biarkan apa adanya.
  if(isStoredPhotoPath($dataUri)) return $dataUri;

  if(!preg_match('#^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$#', $dataUri, $m)){
    fail(422, 'Format foto tidak didukung. Gunakan JPEG, PNG atau WebP.');
  }
  $mime = $m[1];
  $raw  = base64_decode($m[2], true);
  if($raw === false) fail(422, 'Data foto tidak dapat dibaca.');

  $max = (int)(cfg()['max_photo_bytes'] ?? 3145728);
  if(strlen($raw) > $max){
    fail(413, 'Foto melebihi batas ' . round($max / 1048576, 1) . ' MB.');
  }

  // Periksa bahwa isinya memang gambar dan jenisnya cocok dengan yang diakui.
  $info = @getimagesizefromstring($raw);
  if($info === false || empty($info['mime']) || $info['mime'] !== $mime){
    fail(422, 'Berkas yang diunggah bukan gambar yang sah.');
  }
  [$w, $h] = $info;
  if($w < 1 || $h < 1 || $w > 8000 || $h > 8000){
    fail(422, 'Dimensi gambar di luar batas yang wajar.');
  }

  if(!function_exists('imagecreatefromstring')){
    fail(500, 'Ekstensi GD tidak tersedia di server; foto tidak dapat diproses.');
  }
  $img = @imagecreatefromstring($raw);
  if($img === false) fail(422, 'Gambar tidak dapat diproses.');

  // Perkecil bila perlu, lalu simpan sebagai JPEG tanpa metadata.
  $maxPx = 1280;
  if($w > $maxPx || $h > $maxPx){
    $scale = $maxPx / max($w, $h);
    $nw = max(1, (int)round($w * $scale));
    $nh = max(1, (int)round($h * $scale));
    $resized = imagecreatetruecolor($nw, $nh);
    imagefill($resized, 0, 0, imagecolorallocate($resized, 255, 255, 255));
    imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($img);
    $img = $resized;
  } else {
    // Ratakan transparansi PNG/WebP di atas putih agar hasil JPEG benar.
    $flat = imagecreatetruecolor($w, $h);
    imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
    imagecopy($flat, $img, 0, 0, 0, 0, $w, $h);
    imagedestroy($img);
    $img = $flat;
  }

  $dir  = ensureUploadDir();
  $name = bin2hex(random_bytes(16)) . '.jpg';
  $path = $dir . '/' . $name;
  $okWrite = imagejpeg($img, $path, 82);
  imagedestroy($img);
  if(!$okWrite) fail(500, 'Foto gagal disimpan di server.');
  @chmod($path, 0644);

  return uploadRelative() . '/' . $name;
}

// Pola jalur foto yang sah — dipakai juga oleh front-end (safePhotoSrc).
function isStoredPhotoPath(?string $v): bool {
  if(!is_string($v) || $v === '') return false;
  return (bool)preg_match('#^' . preg_quote(uploadRelative(), '#') . '/[a-f0-9]{32}\.jpg$#', $v);
}

// Menghapus berkas foto bila jalurnya sah dan berada di dalam direktori unggahan.
function deletePhotoFile(?string $rel): void {
  if(!isStoredPhotoPath($rel)) return;
  $path = dirname(__DIR__, 2) . '/' . $rel;
  $real = realpath($path);
  $root = realpath(uploadRoot());
  $prefix = $root . DIRECTORY_SEPARATOR;
  if($real !== false && $root !== false && strncmp($real, $prefix, strlen($prefix)) === 0){
    @unlink($real);
  }
}
