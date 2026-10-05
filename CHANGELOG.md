# Riwayat Perubahan

Seluruh perubahan penting pada SIMASET BMN. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/id/1.1.0/); penomoran mengikuti
[Semantic Versioning](https://semver.org/lang/id/).

---

## [3.0.0] — 2026-10-05

Purwarupa statis menjadi aplikasi nyata: ada backend, basis data, autentikasi,
dan hak akses yang ditegakkan di server.

### Ditambahkan

**Basis data**
- `db/schema.sql`: 40 tabel MariaDB. Nama kolom sengaja sama dengan kunci JSON
  front-end sehingga API memetakan baris 1:1 tanpa lapisan penerjemah.
- `db/migrate.php` membangun tabel **dan memverifikasi** setiap tabel yang
  diminta benar-benar terbentuk.
- `db/seed.php` mengisi 904 baris data contoh; kata sandi akun demo di-hash
  saat pengisian. `--force` mengosongkan tabel lebih dahulu.
- `db/export-seed.js` dan `db/gen-rbac.js` sebagai pembangkit, agar tidak ada
  data atau aturan yang ditulis ulang dengan tangan.

**Backend (`api/`)**
- Front controller dengan rute `auth/*`, `bootstrap`, `records/*`,
  `approvals/*/decide`, `audit-log`, dan `health`.
- Autentikasi: `password_verify` terhadap hash, sesi server,
  `session_regenerate_id` setelah masuk.
- Sesi: cookie `HttpOnly` + `Secure` + `SameSite=Lax`.
- Token CSRF wajib pada setiap permintaan yang mengubah keadaan.
- Pembatasan percobaan masuk: 20 kegagalan per IP dan 6 per email per 15 menit.
- Jejak audit untuk create/update/delete/approve/login dan setiap penolakan
  hak akses.
- CRUD generik dengan daftar putih kolom dari `information_schema`, kunci utama
  dibuat server, dan nilai turunan dihitung server.
- Penanganan foto: diperiksa, didekode dan **disandikan ulang** oleh GD, lalu
  disimpan sebagai berkas; basis data menyimpan jalurnya saja.

**Front-end**
- `assets/js/api.js` klien API, `assets/js/boot.js` pemuat data,
  `assets/js/login.js` logika halaman masuk.
- Tombol **Ubah** dan **Hapus** pada tabel daftar maupun pada tabel modul
  berenderer khusus (sensus, rekonsiliasi, aset siber, governance).
- Kolom kata sandi pada formulir pengguna; di-hash di server.
- `docs/API.md`.

### Diubah
- **Hak akses kini ditegakkan di server** pada setiap permintaan. Matriksnya
  dibangkitkan dari `assets/js/rbac.js` sehingga tidak mungkin menyimpang dari
  yang dipakai antarmuka.
- `app.js` tidak lagi berjalan sendiri saat dimuat; ia mendefinisikan
  `window.startSimaset` yang dijalankan `boot.js` setelah data tiba. Seluruh
  kode render yang ada dipakai tanpa diubah.
- Dashboard **menyembunyikan** kartu yang modulnya tidak boleh dibaca, bukan
  menampilkan angka nol yang menyesatkan. Pembagi dijaga agar tidak muncul
  `NaN`.
- Data baru, foto, dan keputusan persetujuan tidak lagi disimpan di
  `localStorage`.
- Skrip sebaris pada `index.html` dipindah ke berkas tersendiri agar CSP dapat
  memakai `script-src 'self'` tanpa `'unsafe-inline'`.
- Seluruh dokumentasi diperbarui mengikuti arsitektur baru.

### Keamanan
- **Dataset lengkap tidak lagi dapat diunduh publik.** `assets/js/data.js`
  dipindah ke `db/seed-src/` dan direktori `db/` ditolak web server; sebelumnya
  seluruh data — termasuk aset siber dan daftar akun — dapat diunduh siapa saja,
  memintas seluruh pemeriksaan hak akses.
- Kata sandi tidak lagi tersimpan sebagai teks terbuka.
- `password_hash` tidak pernah ikut pada respons API mana pun.
- `.htaccess`: tolak `.git` dan `db/`, header keamanan, CSP, paksa HTTPS.
- `api/config.php` tidak ikut repositori dan berizin `600` di server.

### Diperbaiki
- Pemecah pernyataan pada `db/migrate.php` membuang potongan yang dimulai
  dengan komentar `--`, sehingga di server hanya 23 dari 40 tabel terbentuk.
  Kegagalannya tidak terdeteksi saat uji lokal karena skema sudah lebih dulu
  dimuat lewat klien `mariadb`.
- Seluruh identifier SQL di-backtick (`SENSITIVE` adalah reserved word MariaDB).
- Jumlah modul pada halaman masuk: 21 → 27.

### Verifikasi
194 pemeriksaan lokal (API 90, CRUD peramban 30, 10 peran × seluruh modulnya
40, tabel modul khusus 15, keamanan 19) dan **111 pemeriksaan di server
sungguhan** dijalankan dari dalam server terhadap URL publiknya.

---

## [2.2.0] — 2026-10-03

### Ditambahkan
- Set dokumentasi `.md` lengkap: [SECURITY.md](SECURITY.md),
  [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md), [docs/MODUL.md](docs/MODUL.md),
  [docs/HAK-AKSES.md](docs/HAK-AKSES.md), [docs/DATA.md](docs/DATA.md),
  [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md),
  [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md), [docs/DEPLOY.md](docs/DEPLOY.md),
  dan indeks [docs/README.md](docs/README.md).
- README ditulis ulang menyesuaikan kondisi aplikasi saat ini.

### Keamanan
- **`safePhotoSrc()`** — daftar-izin data URI gambar pada seluruh titik
  penyisipan foto (detail aset, bukti Work Order/Inspeksi, thumbnail daftar,
  linimasa riwayat, pratinjau formulir). Mencegah nilai `localStorage` yang
  disunting keluar dari atribut `src` dan menjalankan skrip. Diuji dengan
  payload `…base64,x" onerror="…`, `javascript:`, dan `data:text/html` —
  seluruhnya ditolak dan jatuh kembali ke ilustrasi kategori.
- Kelemahan yang diketahui didokumentasikan terbuka beserta daftar pengerasan
  wajib sebelum produksi.

---

## [2.1.0] — 2026-09-17

### Ditambahkan
- **Foto aset pada master (BMN Register)**: kolom thumbnail pada daftar, blok
  foto pada detail dengan unggah/ganti/hapus, dan lampiran foto pada formulir
  Tambah Aset.
- **Foto pada pencatatan Maintenance & Work Order** dan **Inspection &
  Condition**, langsung dari kamera perangkat pada ponsel.
- Ilustrasi kategori berwarna untuk aset yang belum difoto, dengan warna
  mengikuti kategori aset.
- Foto tampil pada linimasa riwayat aset.

### Teknis
- Kompresi gambar di `<canvas>` (maks 1024 px, JPEG 0,72) sebelum disimpan —
  sekaligus membuang metadata EXIF.
- Foto aset master disimpan pada kunci `localStorage` terpisah.
- Dukungan kolom tabel bertipe HTML, dikecualikan dari ekspor CSV.
- Penanganan kegagalan kuota penyimpanan dengan pemberitahuan ke pengguna.

---

## [2.0.0] — 2026-09-13

### Ditambahkan
- **Kontrol akses berbasis peran (RBAC)**: matriks 10 peran × 27 modul dengan
  tingkat `R`/`RW`/`A` pada `assets/js/rbac.js`; penyaringan menu, *guard*
  rute terhadap akses lewat alamat langsung, dan penyembunyian kontrol ubah
  untuk peran baca-saja.
- Modul **IoT & Telemetry**: 10 perangkat sensor, grafik telemetry berjalan
  dengan ambang batas, alarm yang dapat ditindaklanjuti menjadi Work Order.
- Modul **Integrasi Sistem**: status 7 titik integrasi dan riwayat
  sinkronisasi.
- Modul **Persetujuan Saya**: antrean approval berdasarkan matriks kewenangan.
- Modul **Hak Akses & Peran**: matriks peran × modul dan ekspor CSV.
- Modul **Manajemen Pengguna**: 15 pengguna dengan cakupan modul yang dihitung
  dari matriks RBAC.
- Dokumen daftar pengguna dan hak akses dalam format Word dan PDF.

---

## [1.2.0] — 2026-09-01

### Diubah
- Logo aplikasi diganti menjadi logo LPKMI pada halaman masuk dan aplikasi.
- Branding organisasi diseragamkan menjadi Lembaga Pusat Kajian Manajemen
  Indonesia.

---

## [1.1.0] — 2026-08-29

### Ditambahkan
- Kemampuan **Tambah Data** pada 19 modul dengan validasi dan penyimpanan
  `localStorage`.
- **QR code dan barcode Code128 sungguhan** beserta tampilan label siap cetak.
- **Pratinjau laporan** dengan tata letak sungguhnya dan ekspor cetak/PDF.
- Ekspor CSV pada modul tabel.

---

## [1.0.0] — 2026-08-29

### Ditambahkan
- Purwarupa awal: 21 modul, dataset simulasi, navigasi, dan design system.
