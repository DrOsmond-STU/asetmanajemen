# Keamanan — SIMASET BMN

Dokumen ini menjelaskan model keamanan SIMASET BMN: kontrol yang **benar-benar
ada di dalam kode dan sudah diuji**, kelemahan yang diketahui beserta
statusnya, serta daftar pengerasan yang wajib dikerjakan sebelum sistem dipakai
dengan data BMN sungguhan.

Dokumen terkait: [README](README.md) · [API](docs/API.md) ·
[Hak Akses & Peran](docs/HAK-AKSES.md) · [Arsitektur](docs/ARSITEKTUR.md) ·
[Data](docs/DATA.md) · [Deploy](docs/DEPLOY.md)

---

## 1. Keadaan saat ini

Sejak **v3.0.0** SIMASET BMN bukan lagi purwarupa front-end. Aplikasi ini
memiliki backend PHP dan basis data MariaDB, dan hal berikut sudah berubah
secara mendasar:

| Hal | Sebelum (v2.x) | Sekarang (v3.0.0) |
|---|---|---|
| Hak akses | Kontrol antarmuka saja; dapat dilewati dari DevTools | **Ditegakkan di server** pada setiap permintaan |
| Autentikasi | Pencocokan kata sandi di peramban | `password_verify` terhadap hash di basis data, sesi server |
| Data | Seluruh dataset dikirim ke setiap peramban | Server hanya mengirim dataset yang boleh dibaca peran itu |
| Kata sandi | Teks terbuka di `assets/js/data.js` yang dapat diunduh publik | Hash di basis data; tidak pernah ikut pada respons API |
| Data baru | `localStorage` per perangkat | Basis data, dengan jejak audit |
| Foto | Data URI di `localStorage` | Berkas di server, disandikan ulang sehingga metadata terbuang |

### Yang masih harus dipahami

> **Data yang terpasang sekarang adalah data contoh, dan kata sandi akun demo
> dipublikasikan** (`simaset123`) supaya aplikasi dapat diperagakan siapa saja.

Selama kata sandi demo masih seperti itu, **siapa pun di internet dapat masuk
sebagai Super Admin** dan mengubah seluruh data. Karena itu:

**Jangan memasukkan data BMN sungguhan, data pribadi, dokumen internal, atau
foto aset sensitif sebelum §5 dikerjakan.**

---

## 2. Lingkup dan aset yang dilindungi

| Aset informasi | Lokasi | Sensitivitas |
|---|---|---|
| Kredensial basis data | `api/config.php` di server — **tidak ikut git**, izin `600` | **Tinggi** |
| Hash kata sandi pengguna | `users.password_hash` | **Tinggi** |
| Data aset BMN | tabel basis data | Sedang (contoh) → **Tinggi** bila diisi data sungguhan |
| Foto aset / bukti pekerjaan | berkas di `uploads/photos/` | **Sedang–tinggi** — foto dapat memuat ruangan, perangkat, atau dokumen |
| Aset siber & kripto | tabel `cyber_assets`, `access_logs` | **Tinggi** — hanya 6 peran berhak membacanya |
| Jejak audit | tabel `audit_log` | Sedang — bukti pemeriksaan |
| Sesi pengguna aktif | cookie `SIMASETSID` (HttpOnly) + sesi server | Sedang |

Berkas yang **tidak boleh** dapat diakses lewat HTTP dan sudah diblokir:
`api/config.php`, seluruh `api/lib/`, seluruh `db/` (skema, seeder, data
sumber), dan direktori `.git/`. Lihat §3.7.

---

## 3. Kontrol yang sudah diterapkan

Semuanya ada di dalam kode dan terverifikasi oleh uji otomatis (§6).

### 3.1 Kontrol akses berbasis peran — di server

Matriks 10 peran × 27 modul dengan tiga tingkat: `R` (lihat), `RW` (lihat +
ubah), `A` (lihat + ubah + setujui). Sumber kebenarannya satu berkas:
[`assets/js/rbac.js`](assets/js/rbac.js).

Versi PHP-nya, [`api/lib/rbac-matrix.php`](api/lib/rbac-matrix.php),
**dibangkitkan** dari berkas itu oleh `node db/gen-rbac.js` — tidak ditulis
ulang dengan tangan, sehingga aturan di server tidak mungkin menyimpang dari
yang dipakai antarmuka.

Penegakan di server, pada setiap permintaan:

| Jalur | Pemeriksaan |
|---|---|
| `GET /api/records/{dataset}` | `requireRead` pada modul dataset |
| `POST` / `PUT` / `DELETE /api/records/…` | `requireWrite` |
| `POST /api/approvals/{id}/decide` | `requireApprove` pada modul `approval` **dan** modul yang diampu permintaan, lalu `role_required` harus cocok |
| `GET /api/bootstrap` | tiap dataset disaring; yang tidak boleh dibaca dikirim sebagai array kosong |

Prinsipnya **tolak secara bawaan**: `rbacLevel()` mengembalikan `'-'` untuk
peran atau modul yang tidak terdaftar, dan `'-'` berarti tidak ada akses.

Pemeriksaan di peramban (menu, tombol, penjaga rute) tetap ada, tetapi
fungsinya hanya mengatur tampilan. Menghapus seluruh kode itu dari DevTools
tidak memberi akses apa pun — uji otomatis membuktikannya dengan memanggil
`API.create()` langsung dari konsol sebagai Auditor dan menerima `403`.

### 3.2 Autentikasi dan sesi

- Kata sandi diperiksa dengan `password_verify` terhadap `password_hash`
  (bcrypt, `PASSWORD_DEFAULT`). Tidak ada kata sandi teks terbuka di basis
  data maupun di kode.
- Verifikasi hash **tetap dijalankan walau email tidak terdaftar**, memakai
  hash tiruan, agar waktu tanggapan tidak membocorkan email mana yang ada.
- Pesan galat **seragam** untuk kata sandi salah, email tidak ada, dan akun
  tidak aktif: `Email atau kata sandi tidak dikenali.`
- Hanya akun berstatus `Aktif` yang dapat masuk.
- Cookie sesi: `HttpOnly` (tidak terbaca JavaScript), `Secure` (hanya HTTPS),
  `SameSite=Lax` (tidak dikirim pada permintaan lintas situs).
- `session_regenerate_id(true)` setelah masuk berhasil — mencegah
  *session fixation*.
- Tidak ada data pengguna yang disimpan di `localStorage` atau
  `sessionStorage`; identitas sepenuhnya dipegang sesi server.

### 3.3 Pembatasan percobaan masuk

Tabel `login_attempts` mencatat setiap percobaan. Dalam jendela **15 menit**:

- maksimum **20 kegagalan per alamat IP**,
- maksimum **6 kegagalan per email**.

Melewati batas → `429` tanpa memeriksa kata sandi lagi. Diuji: enam kegagalan
beruntun memblokir akun itu sementara email lain tetap dapat masuk.

### 3.4 CSRF

Setiap permintaan yang mengubah keadaan (`POST`, `PUT`, `PATCH`, `DELETE`)
wajib menyertakan header `X-CSRF-Token` yang sama dengan token pada sesi,
dibandingkan dengan `hash_equals`. Tanpa token atau token salah → `419`.
Hanya `auth/login` dikecualikan, dan jalur itu dilindungi pembatas percobaan.

`SameSite=Lax` saja dianggap belum cukup karena peramban lama menanganinya
secara berbeda.

### 3.5 Masukan tidak pernah dipercaya

- **Seluruh kueri memakai pernyataan tersiapkan** PDO dengan
  `ATTR_EMULATE_PREPARES => false`, sehingga nilai disiapkan di sisi server
  basis data dan tidak pernah disisipkan ke teks SQL.
- Nama tabel dan kolom **hanya** berasal dari daftar putih di
  `api/lib/datasets.php` dan `information_schema`; `ident()` menjadi jaring
  pengaman terakhir dengan pola `^[A-Za-z_][A-Za-z0-9_]*$`.
- Tipe dan panjang kolom dibaca dari `information_schema`, bukan ditulis ulang,
  sehingga validasi tidak mungkin menyimpang dari skema.
- Kolom yang tidak ada pada tabel **dibuang tanpa suara**.
- Kunci utama **selalu** dibuat server; nilai id dari klien diabaikan.
- Nilai turunan dihitung server, bukan dipercayakan ke klien: `bmn_uid`,
  `category_code`, `sensitive`, `condition_label`, `location_id`,
  `custodian_id`, `asset_name`, `score` dan `level` risiko, serta kolom
  berbasis identitas (`requestor`, `operator`, `uploaded_by`, `user`) yang
  diambil dari sesi.
- Kolom `password_hash` ditandai `hidden` sehingga **tidak pernah** ikut pada
  respons API mana pun, termasuk `GET /api/records/users`.

### 3.6 Penanganan foto

Foto adalah satu-satunya berkas yang diunggah pengguna, jadi perlakuannya
ketat:

1. Hanya data URI `image/jpeg`, `image/png`, `image/webp` yang diterima.
   SVG **ditolak** karena dapat memuat skrip.
2. Isinya diperiksa dengan `getimagesizefromstring` dan jenisnya harus cocok
   dengan yang diakui.
3. Isinya **didekode dan disandikan ulang** dengan GD menjadi JPEG. Ini
   membuang seluruh metadata — termasuk koordinat GPS pada EXIF — dan membuat
   berkas yang hanya *tampak* seperti gambar gagal di tahap ini.
4. Nama berkas dibuat server: 32 digit heksadesimal acak, ekstensi selalu
   `.jpg`. Nama kiriman pengguna tidak pernah dipakai.
5. Direktori `uploads/photos/` otomatis diberi `.htaccess` yang mematikan
   mesin PHP dan menolak berkas berekstensi skrip.
6. Batas ukuran 3 MB dan dimensi maksimum 8000 px.
7. Penghapusan berkas memeriksa `realpath` berada di dalam direktori unggahan
   sebelum `unlink`.

Di sisi peramban, `safePhotoSrc()` hanya meloloskan data URI gambar atau jalur
berpola `uploads/photos/<32 heks>.jpg` sebelum nilainya masuk ke atribut `src`.

### 3.7 Berkas yang tidak dapat diakses lewat HTTP

`.htaccess` akar dan `api/.htaccess` menolak:

| Jalur | Alasan |
|---|---|
| `/.git/` | Deploy memakai git sehingga riwayat berada di dalam docroot; tanpa aturan ini seluruh kode dan riwayatnya dapat diunduh |
| `/db/` | Skema, seeder, dan data sumber. `db/seed.php` jika dapat dipanggil lewat HTTP berarti siapa pun dapat mengosongkan basis data |
| `/api/config.php` | Kredensial basis data |
| `/api/lib/` | Seluruh pustaka internal; satu-satunya pintu masuk adalah `api/index.php` |
| `.sql`, `.log`, `.ini`, `.sh`, `.bak`, berkas berawalan titik | Pola umum berkas internal |

`db/seed-src/data.js` (dataset lengkap) dahulu berada di `assets/js/` dan
**dapat diunduh siapa saja** — memintas seluruh pemeriksaan hak akses. Berkas
itu sudah dipindah ke `db/` yang diblokir. Lihat K-07.

### 3.8 Header keamanan

Dikirim pada setiap respons:

```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;
  connect-src 'self'; form-action 'self'; base-uri 'self';
  object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

Catatan:

- **`script-src` tidak memuat `'unsafe-inline'`.** Skrip sebaris yang dahulu
  ada di `index.html` sudah dipindah ke `assets/js/login.js` agar hal ini
  mungkin. Ini membuat CSP benar-benar berguna melawan XSS.
- `style-src` masih memerlukan `'unsafe-inline'` karena banyak komponen
  memakai atribut `style` sebaris — lihat K-05.
- `img-src data:` diperlukan untuk pratinjau foto sebelum diunggah, ikon
  favicon SVG, dan ilustrasi kategori yang dibuat di peramban.
- `camera=(self)` diperlukan untuk pengambilan foto aset dari perangkat
  bergerak.
- HTTP dialihkan ke HTTPS lewat `mod_rewrite`.

### 3.9 Jejak audit

Tabel `audit_log` mencatat waktu, pengguna, peran, aksi, dataset, id baris, dan
IP untuk: `login`, `login_failed`, `login_throttled`, `logout`, `create`,
`update`, `delete`, `approve`, dan **`denied`** — setiap penolakan hak akses.
Kegagalan pencatatan tidak pernah menggagalkan permintaan pengguna, tetapi
dicatat ke log galat PHP.

Dapat dibaca lewat `GET /api/audit-log` oleh peran yang berhak atas modul
`audit`.

### 3.10 Pengungkapan galat

`debug` **wajib** `false` di server. Dengan begitu:

- galat server menghasilkan pesan umum `Terjadi kesalahan pada server.`;
- rinciannya (pesan, berkas, baris) hanya masuk log galat PHP;
- galat koneksi basis data tidak pernah diteruskan ke klien karena pesan
  aslinya dapat memuat kredensial.

---

## 4. Kelemahan yang diketahui

| # | Kelemahan | Dampak | Status |
|---|---|---|---|
| **K-01** | **Kata sandi akun demo dipublikasikan** (`simaset123`, 10 akun termasuk Super Admin) | Siapa pun di internet dapat masuk dan mengubah seluruh data | **Diterima sementara** — disengaja agar dapat diperagakan. **Wajib** diubah sebelum data sungguhan (§5.1) |
| **K-02** | Tidak ada MFA | Satu kata sandi bocor = akun terkuasai | **Terbuka** — kolom status MFA sudah ada pada data pengguna, mekanismenya belum |
| **K-03** | Tidak ada kebijakan kata sandi selain panjang minimum 10 karakter | Kata sandi lemah dapat dipakai | **Mitigasi parsial** — panjang minimum ada, riwayat/kompleksitas/kedaluwarsa belum |
| **K-04** | Pembatas percobaan masuk berbasis `REMOTE_ADDR` | Penyerang dengan banyak IP dapat memperlambat, bukan menghentikan | **Mitigasi parsial** — batas per email ikut membatasi serangan ke satu akun |
| **K-05** | `style-src 'unsafe-inline'` masih diperlukan | Mengurangi manfaat CSP terhadap penyuntikan gaya | **Terbuka** — perlu memindahkan ±200 atribut `style` sebaris ke kelas CSS |
| **K-06** | Foto yang sudah tersimpan dapat diakses siapa saja yang tahu URL-nya | Foto bukan rahasia per peran; nama berkas acak 128 bit menjadi satu-satunya penghalang | **Diterima** — ganti dengan penyajian lewat PHP yang memeriksa sesi bila foto memuat hal sensitif (§5.6) |
| **K-07** | ~~Dataset lengkap dapat diunduh publik di `assets/js/data.js`~~ | ~~Memintas seluruh RBAC~~ | **Ditutup v3.0.0** — dipindah ke `db/seed-src/`, direktori `db/` ditolak web server, dan berkasnya tidak lagi dimuat halaman mana pun |
| **K-08** | ~~RBAC hanya kontrol antarmuka~~ | ~~Dapat dilewati dari DevTools~~ | **Ditutup v3.0.0** — ditegakkan di server pada setiap permintaan |
| **K-09** | ~~Kata sandi tersimpan terbuka~~ | ~~Dapat dibaca siapa saja~~ | **Ditutup v3.0.0** — `password_hash` di basis data |
| **K-10** | Integrasi SAKTI/SIMAN, HR, Finance, IoT belum terhubung | Status dan riwayat yang ditampilkan adalah simulasi | **Terbuka** — bukan kelemahan keamanan, tetapi jangan dianggap data nyata |
| **K-11** | Lima pengguna operasional tanpa kata sandi | Belum dapat masuk | **Disengaja** — tetapkan kata sandi lewat modul Manajemen Pengguna |
| **K-12** | Tidak ada penguncian baris saat pembuatan ID | Dua permintaan bersamaan dapat memilih nomor yang sama | **Mitigasi** — benturan kunci terdeteksi basis data dan dicoba ulang hingga 5 kali |

---

## 5. Pengerasan sebelum dipakai dengan data sungguhan

### 5.1 Kredensial — wajib pertama

1. Ganti kata sandi **seluruh** akun demo lewat modul Manajemen Pengguna, atau
   langsung di basis data dengan `password_hash`.
2. Hapus atau nonaktifkan akun demo yang tidak diperlukan.
3. Hapus daftar `DEMO_ACCOUNTS` dan `DEMO_PASSWORD` dari
   [`assets/js/login.js`](assets/js/login.js) agar pintasan isi-otomatis dan
   kata sandi peragaan hilang dari halaman masuk.
4. Hapus baris `akun_demo = 'Ya'` pada data pengguna, atau ubah nilainya.
5. Ganti kata sandi pengguna basis data pada `api/config.php`.

### 5.2 Periksa yang sudah ada — setiap kali deploy

```bash
# Harus 403/404, bukan isi berkas:
curl -sI https://domain/.git/HEAD
curl -sI https://domain/db/schema.sql
curl -sI https://domain/db/seed.php
curl -sI https://domain/api/config.php
curl -sI https://domain/api/lib/db.php

# Harus 404 (berkas sudah dipindah):
curl -sI https://domain/assets/js/data.js

# Harus memuat CSP tanpa 'unsafe-inline' pada script-src:
curl -sI https://domain/index.html | grep -i content-security-policy
```

Skrip yang menjalankan seluruh pemeriksaan ini beserta uji API lengkap ada di
[docs/DEPLOY.md §5](docs/DEPLOY.md#5-verifikasi).

### 5.3 Izin berkas

```bash
chmod 600 api/config.php        # hanya pemilik; memuat kredensial
chmod 755 uploads uploads/photos
```

### 5.4 Yang masih perlu dibangun

| Kebutuhan | Keterangan |
|---|---|
| **MFA** | TOTP untuk peran Super Admin, Asset Manager, Cyber Officer, dan Management minimal |
| **Kebijakan kata sandi** | Kompleksitas, riwayat, kedaluwarsa, penolakan kata sandi yang pernah bocor |
| **Pencadangan** | Dump basis data terjadwal + `uploads/` ke lokasi terpisah, beserta uji pemulihan |
| **Pemantauan** | Peringatan untuk lonjakan `login_failed` dan `denied` pada `audit_log` |
| **Retensi jejak audit** | `audit_log` tumbuh tanpa batas; tentukan masa simpan dan arsipnya |
| **Enkripsi saat diam** | Untuk kolom aset siber/kripto bila klasifikasinya menuntut |
| **Uji penetrasi** | Oleh pihak ketiga sebelum menerima data BMN sungguhan |

### 5.5 Kebersihan basis data

- Pengguna basis data sudah terpisah per aplikasi dan hanya berhak atas satu
  basis data. Jangan memberinya hak di luar itu.
- Jangan pernah menjalankan `php db/seed.php --force` di server setelah ada
  data sungguhan: perintah itu **mengosongkan seluruh tabel** lebih dahulu.
  Skrip penyiapan di server memakai berkas penanda agar tidak terulang.

### 5.6 Bila foto memuat hal sensitif

Ganti penyajian berkas statis dengan skrip PHP yang memeriksa sesi dan hak
akses sebelum mengirim isi berkas, lalu pindahkan `uploads/` ke luar docroot.
Selama belum, anggap foto dapat dilihat siapa pun yang memperoleh URL-nya
(K-06).

---

## 6. Verifikasi

Keamanan di dokumen ini bukan klaim di atas kertas. Rinciannya diuji oleh
rangkaian uji otomatis:

| Rangkaian | Jumlah | Yang diuji |
|---|---|---|
| API lokal | 90 | Autentikasi, CSRF, CRUD, masukan tak dipercaya, RBAC, persetujuan, pembatas login |
| CRUD peramban | 30 | Tambah/ubah/hapus nyata, persistensi setelah muat ulang, foto, penolakan server saat dipaksa dari konsol |
| 10 peran × modulnya | 40 | Menu persis sama dengan matriks, 178 pemuatan halaman tanpa galat JS, modul terlarang menampilkan Akses Ditolak |
| Tabel modul khusus | 15 | Ubah/hapus pada sensus, rekonsiliasi, aset siber, governance |
| Keamanan | 19 | Unggah foto berbahaya, injeksi SQL, traversal, kebocoran kolom tersembunyi |
| **Server sungguhan** | **111** | Seluruhnya di atas, dijalankan dari dalam server terhadap URL publiknya — termasuk `.htaccess`, header, dan cookie HTTPS |

Uji server dijalankan dari dalam server karena lingkungan pengembangan tidak
dapat menjangkau domain; berkasnya ada di `/home/semestat/simaset-apitest.php`
(di luar docroot).

---

## 7. Aturan pengembangan

1. **Jangan pernah** menambahkan kueri yang menyusun SQL dari nilai masukan.
   Selalu pernyataan tersiapkan; nama kolom hanya dari daftar putih.
2. **Jangan pernah** memercayai kiriman klien untuk kunci utama, kolom turunan,
   atau kolom berbasis identitas pengguna.
3. Setiap rute baru yang membaca atau mengubah data **wajib** memanggil
   `requireRead` / `requireWrite` / `requireApprove`.
4. Nilai apa pun yang masuk ke HTML harus lewat `esc()`; untuk atribut `src`
   gambar lewat `safePhotoSrc()`.
5. Bila `assets/js/rbac.js` berubah, jalankan `node db/gen-rbac.js` agar
   matriks server mengikuti, lalu jalankan ulang rangkaian uji.
6. Jangan menaruh kredensial di dalam kode atau repositori. Hanya
   `api/config.php` di server, dan berkas itu ada di `.gitignore`.
7. Pesan galat untuk pengguna tidak boleh memuat nama tabel, kolom, jalur
   berkas, atau pesan asli basis data.

---

## 8. Melaporkan masalah keamanan

Laporkan ke pengelola sistem LPKMI. Jangan membuka isu publik berisi rincian
kerentanan sebelum ditangani. Sertakan: langkah reproduksi, dampak yang
diperkirakan, dan versi/commit yang diuji.

---

## 9. Riwayat perbaikan keamanan

| Versi | Perbaikan |
|---|---|
| **3.0.0** | RBAC ditegakkan di server (K-08 ditutup); kata sandi di-hash (K-09 ditutup); dataset lengkap tidak lagi dapat diunduh publik (K-07 ditutup); sesi cookie HttpOnly/Secure/SameSite; token CSRF; pembatas percobaan masuk; jejak audit; foto disandikan ulang di server; `.git` dan `db/` ditolak web server; CSP tanpa `'unsafe-inline'` pada `script-src`; `password_hash` tidak pernah ikut pada respons API |
| 2.2.0 | `safePhotoSrc()` — daftar-izin data URI gambar sebelum nilai masuk ke atribut `src`, menutup XSS lewat nilai foto yang dapat disunting pemilik peramban |
| 2.1.0 | Penjaga rute dan penyaringan menu berdasarkan matriks hak akses |
| 2.0.0 | Seluruh pustaka pihak ketiga di-host sendiri, menghapus ketergantungan CDN |
