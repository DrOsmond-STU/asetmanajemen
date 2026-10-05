# SIMASET BMN

**Integrated Asset & BMN Lifecycle Management System** — aplikasi manajemen
aset dan Barang Milik Negara yang selaras dengan prinsip **ISO 55000/55001**,
ketentuan pengelolaan BMN, dan praktik keamanan informasi **ISO/IEC 27001**.

Dikembangkan oleh **Lembaga Pusat Kajian Manajemen Indonesia (LPKMI)**.

🔗 **Aplikasi berjalan:** https://simaset.semestateknologiutama.com

> ℹ️ **Aplikasi penuh dengan basis data.** Sejak v3.0.0 SIMASET BMN memiliki
> backend PHP + MariaDB: data tersimpan di basis data, kata sandi di-hash, dan
> hak akses ditegakkan di server pada setiap permintaan. Data yang terpasang
> saat ini masih **data contoh** untuk peragaan. Baca
> **[SECURITY.md](SECURITY.md)** sebelum mengisi data sungguhan.

---

## Isi singkat

| | |
|---|---|
| **27 modul** | dalam 10 kelompok navigasi — register, operasional lapangan, pemeliharaan, risiko, kepatuhan BMN, keamanan siber, governance, pelaporan, integrasi |
| **10 peran pengguna** | matriks kewenangan `R` / `RW` / `A` per modul, ditegakkan di server |
| **15 pengguna** | 10 akun demo yang dapat dipakai masuk + 5 pengguna operasional |
| **40 tabel** | basis data MariaDB, terisi 904 baris data contoh |
| **CRUD lengkap** | tambah, lihat, ubah, hapus pada seluruh modul berformulir |
| **0 dependensi runtime eksternal** | seluruh pustaka JavaScript di-host sendiri |

## Arsitektur singkat

```
Peramban                          Server
┌───────────────────────┐        ┌──────────────────────────────┐
│ index.html  (masuk)   │──POST─▶│ /api/auth/login              │
│ app/index.html (SPA)  │──GET──▶│ /api/bootstrap               │
│   boot.js  → app.js   │◀──────-│   data sesuai hak akses peran│
│   api.js              │──CRUD─▶│ /api/records/{dataset}       │
└───────────────────────┘        │ RBAC + CSRF + sesi diperiksa │
                                 └──────────────┬───────────────┘
                                                │ PDO prepared
                                         ┌──────▼───────┐
                                         │   MariaDB    │
                                         │   40 tabel   │
                                         └──────────────┘
```

Rincian: [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) ·
API: [docs/API.md](docs/API.md)

## Menjalankan secara lokal

Dibutuhkan **PHP 7.4+** (dengan `pdo_mysql`, `gd`, `mbstring`) dan
**MySQL/MariaDB**.

```bash
# 1. Siapkan basis data
mysql -u root -e "CREATE DATABASE simaset CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Konfigurasi
cp api/config.sample.php api/config.php
#    lalu isi host/nama/user/pass, dan untuk pengembangan lokal:
#      'debug' => true, 'secure_cookies' => false

# 3. Bangun tabel lalu isi data contoh
php db/migrate.php
php db/seed.php

# 4. Jalankan
php -S 127.0.0.1:8080 router.php      # lihat catatan di bawah
```

> Server bawaan PHP tidak membaca `.htaccess`, sehingga rute `/api/*` perlu
> router kecil. Contohnya ada di [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md#menjalankan-lokal).
> Di server sungguhan (Apache/LiteSpeed) `api/.htaccess` sudah menanganinya.

Buka `http://localhost:8080/index.html`, lalu masuk dengan salah satu akun demo
(kata sandi seragam **`simaset123`**):

| Peran | Email | Menu tampil |
|---|---|---|
| Super Admin | `admin@simaset.go.id` | 27 |
| Asset Manager | `asset.manager@simaset.go.id` | 26 (7 dapat disetujui) |
| BMN Officer | `bmn.officer@simaset.go.id` | 25 |
| Finance | `finance@simaset.go.id` | 11 |
| Maintenance | `maintenance@simaset.go.id` | 11 |
| Inspector | `inspector@simaset.go.id` | 11 |
| Custodian | `custodian@simaset.go.id` | 10 |
| Cyber Officer | `cyber.officer@simaset.go.id` | 14 (2 dapat disetujui) |
| Auditor | `auditor@simaset.go.id` | 27 (semua lihat saja) |
| Management | `management@simaset.go.id` | 16 (5 dapat disetujui) |

Lima pengguna operasional (`USR-011`–`USR-015`) sengaja **tidak diberi kata
sandi**, sehingga belum dapat masuk sampai kata sandinya ditetapkan lewat modul
Manajemen Pengguna. Daftar lengkap: [docs/HAK-AKSES.md](docs/HAK-AKSES.md).

## Struktur proyek

```
index.html                      Halaman masuk
app/index.html                  Kerangka aplikasi (SPA) setelah masuk
.htaccess                       Header keamanan, CSP, tolak .git dan db/
api/
  index.php                     Front controller API (satu pintu masuk)
  config.sample.php             Contoh konfigurasi (config.php tidak ikut git)
  .htaccess                     Rute /api/* dan proteksi berkas internal
  lib/db.php                    Koneksi PDO
  lib/respond.php               Respons JSON
  lib/auth.php                  Sesi, CSRF, pembatas login, jejak audit
  lib/rbac.php                  Penegakan hak akses di server
  lib/rbac-matrix.php           Matriks (dibangkitkan dari assets/js/rbac.js)
  lib/datasets.php              Peta dataset -> tabel, modul, pola ID
  lib/records.php               CRUD generik, validasi, nilai turunan
  lib/photos.php                Simpan foto: periksa, sandikan ulang, tulis berkas
db/
  schema.sql                    DDL 40 tabel
  migrate.php                   Membangun tabel + memverifikasinya
  seed.php                      Mengisi data contoh, hash kata sandi demo
  seed-data.json                Data contoh (hasil ekspor)
  seed-src/                     Sumber data contoh — TIDAK disajikan web server
  export-seed.js                seed-src -> seed-data.json
  gen-rbac.js                   rbac.js -> api/lib/rbac-matrix.php
assets/css/style.css            Design system: token, tata letak, komponen
assets/js/icons.js              Set ikon SVG inline
assets/js/api.js                Klien API (sesi, CSRF, galat)
assets/js/login.js              Logika halaman masuk
assets/js/boot.js               Memuat data dari API lalu menjalankan SPA
assets/js/rbac.js               Matriks hak akses 10 peran x 27 modul (sumber)
assets/js/modules.js            Registri modul: kolom, filter, KPI, label
assets/js/app.js                Router hash, rendering, formulir, CRUD, foto
assets/js/vendor/               Chart.js, qrcode-generator, JsBarcode
uploads/photos/                 Foto terunggah (tidak ikut git)
docs/                           Dokumentasi + berkas paparan & laporan
```

## Fitur utama

- **Register BMN** dengan identitas ganda (Asset ID internal ↔ Kode Satker +
  Kode Barang + NUP), foto aset, dan detail bertab.
- **CRUD lengkap** pada seluruh modul berformulir: tambah, ubah dan hapus
  langsung dari tabel, mengikuti kewenangan peran.
- **QR Code & Barcode sungguhan** (bukan gambar contoh) lengkap dengan tampilan
  label siap cetak. Tag otomatis dibuat server untuk setiap aset baru.
- **Pencatatan lapangan**: sensus dengan antrean anomali, mutasi/IMACD,
  custodian, dan siklus Joiner–Mover–Leaver.
- **Pemeliharaan & inspeksi** dengan lampiran foto kondisi dari kamera
  perangkat; foto disandikan ulang di server sehingga metadata terbuang.
- **IoT & Telemetry**: 10 perangkat sensor, grafik telemetry berjalan, alarm
  ambang batas yang dapat ditindaklanjuti menjadi Work Order.
- **Risiko, kinerja (AHI) dan biaya siklus hidup** sebagai dasar keputusan
  Keep / Maintain / Refurbish / Replace / Dispose. Skor risiko dihitung server.
- **Kepatuhan BMN**: rekonsiliasi SAKTI/SIMAN dan dossier disposal.
- **Keamanan siber**: aset sensitif, sanitisasi media mengacu NIST SP 800-88 Rev.2.
- **Persetujuan berbasis peran** — kewenangan diperiksa server terhadap peran
  yang disyaratkan tiap permintaan.
- **Jejak audit** setiap pembuatan, perubahan, penghapusan dan penolakan akses.
- **Pelaporan** dengan ekspor PDF/Excel/CSV.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| **[SECURITY.md](SECURITY.md)** | Model keamanan, kontrol yang ada, kelemahan yang diketahui, pengerasan sebelum data sungguhan |
| [docs/README.md](docs/README.md) | Indeks seluruh dokumentasi dan berkas paparan |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Arsitektur, alur permintaan, keputusan teknis |
| [docs/API.md](docs/API.md) | Daftar endpoint, bentuk permintaan/jawaban, kode galat |
| [docs/MODUL.md](docs/MODUL.md) | Katalog 27 modul beserta fungsinya |
| [docs/HAK-AKSES.md](docs/HAK-AKSES.md) | Peran, matriks kewenangan, cara penegakannya |
| [docs/DATA.md](docs/DATA.md) | Skema basis data, dataset, dan penyimpanan foto |
| [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md) | Panduan pemakaian per peran dan alur kerja utama |
| [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md) | Cara menambah modul, formulir, peran; konvensi & pengujian |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Penempatan ke server, penyiapan basis data, verifikasi |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan |

## Batasan yang masih berlaku

- **Data yang terpasang adalah data contoh**, bukan data BMN sungguhan.
- **Kata sandi akun demo dipublikasikan** (`simaset123`) agar aplikasi dapat
  diperagakan. Harus diganti sebelum dipakai dengan data sungguhan.
- **Integrasi SAKTI/SIMAN, HR, Finance dan IoT belum terhubung** ke sistem
  sungguhan; modul Integrasi menampilkan status dan riwayat simulasi, dan
  telemetry IoT dibangkitkan di peramban.
- **Belum ada MFA**, meskipun kolom status MFA sudah ada pada data pengguna.
- Ekspor PDF memakai dialog cetak peramban.

Rincian lengkap beserta rencana pengerasan: [SECURITY.md](SECURITY.md).

## Lisensi dan kepemilikan

Hak cipta © 2026 Lembaga Pusat Kajian Manajemen Indonesia (LPKMI).
Penggunaan internal untuk keperluan kajian, demonstrasi dan pelatihan.
