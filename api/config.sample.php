<?php
// ==========================================================================
// SIMASET BMN — Konfigurasi basis data
// --------------------------------------------------------------------------
// Salin berkas ini menjadi api/config.php di server, lalu isi kredensialnya.
// api/config.php SENGAJA TIDAK diikutkan ke git (lihat .gitignore) sehingga
// kata sandi basis data tidak pernah masuk ke repositori.
// ==========================================================================

return [
  'db' => [
    'host'     => 'localhost',
    'port'     => 3306,
    'name'     => 'namadb',
    'user'     => 'namauser',
    'pass'     => 'katasandi',
    // Diisi hanya saat pengembangan lokal (socket Unix), kosongkan di server.
    'socket'   => '',
  ],

  // true hanya saat pengembangan: menampilkan pesan galat lengkap pada respons.
  'debug' => false,

  // Paksa cookie sesi hanya lewat HTTPS. Biarkan true di server.
  'secure_cookies' => true,

  // Direktori penyimpanan foto, relatif terhadap akar dokumen.
  'upload_dir' => 'uploads/photos',

  // Batas unggah foto (byte).
  'max_photo_bytes' => 3145728,
];
