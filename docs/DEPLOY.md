# Deploy — SIMASET BMN

Dokumen terkait: [README](../README.md) · [Arsitektur](ARSITEKTUR.md) ·
[Data](DATA.md) · [Keamanan](../SECURITY.md)

---

## 1. Kebutuhan server

| Hal | Minimum | Di server saat ini |
|---|---|---|
| PHP | 7.4 | **8.3.35** (handler `lsapi`) |
| Ekstensi PHP | `pdo_mysql`, `gd`, `mbstring`, `json`, `session` | semuanya ada |
| Basis data | MySQL 5.7 / MariaDB 10.3 | **MariaDB 11.4** |
| Web server | Apache atau LiteSpeed dengan `mod_rewrite` + `mod_headers` dan `.htaccess` aktif | LiteSpeed (DomaiNesia) |
| HTTPS | wajib — cookie sesi bertanda `Secure` | aktif |

Tidak ada langkah bangun, tidak ada Composer, tidak ada Node di server. Berkas
yang ada di repositori sama dengan yang dijalankan.

---

## 2. Penempatan saat ini

| | |
|---|---|
| Domain | `simaset.semestateknologiutama.com` |
| Docroot | `/home/semestat/simaset.semestateknologiutama.com` |
| Repositori | `github.com/DrOsmond-STU/asetmanajemen` |
| Cabang | `claude/asset-management-ui-prototype-xum2vt` |
| Metode | cPanel Git Deployment (id `f9396dd2`), mode manual |
| Basis data | `semestat_simaset` |
| Pengguna basis data | `semestat_simaset` (hanya berhak atas basis data itu) |

Deploy menjalankan:

```
git fetch --depth=1 <repo> <cabang>
git reset --hard FETCH_HEAD
```

`git reset --hard` **tidak menyentuh berkas tak terlacak**, sehingga
`api/config.php` dan `uploads/` bertahan melewati setiap deploy. `git clean`
tidak dijalankan — jangan menambahkannya.

---

## 3. Penyiapan pertama kali

### 3.1 Basis data

```sql
CREATE DATABASE namadb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'namauser'@'localhost' IDENTIFIED BY '<kata sandi kuat>';
GRANT ALL PRIVILEGES ON namadb.* TO 'namauser'@'localhost';
```

Di cPanel: **MySQL Databases** → buat basis data, buat pengguna, lalu berikan
hak **hanya** pada basis data itu.

### 3.2 Konfigurasi

Buat `api/config.php` **langsung di server** (jangan lewat git):

```php
<?php
return [
  'db' => [
    'host' => 'localhost', 'port' => 3306,
    'name' => 'namadb', 'user' => 'namauser', 'pass' => '<kata sandi>',
    'socket' => '',
  ],
  'debug'           => false,   // WAJIB false di server
  'secure_cookies'  => true,    // WAJIB true di server (HTTPS)
  'upload_dir'      => 'uploads/photos',
  'max_photo_bytes' => 3145728,
];
```

Lalu:

```bash
chmod 600 api/config.php
mkdir -p uploads/photos && chmod 755 uploads uploads/photos
```

### 3.3 Tabel dan data awal

```bash
cd /path/ke/docroot
php db/migrate.php     # membangun 40 tabel lalu memverifikasi semuanya ada
php db/seed.php        # mengisi 904 baris data contoh (hanya tabel kosong)
```

`db/migrate.php` aman diulang (`CREATE TABLE IF NOT EXISTS`) dan **keluar
dengan kode 1** bila ada tabel yang tidak terbentuk.

> `php db/seed.php --force` **mengosongkan seluruh tabel** lebih dahulu. Hanya
> untuk penyiapan awal atau lingkungan uji. Jangan di server setelah ada data
> sungguhan.

### 3.4 Bila tidak ada akses SSH

Di hosting bersama tanpa SSH, jalankan langkah 3.3 lewat **cron satu kali**
dengan skrip di **luar** docroot (agar tidak dapat dipanggil lewat HTTP), dan
pakai berkas penanda supaya tidak terulang:

```bash
#!/bin/bash
PENANDA=/home/user/.simaset-setup.done
[ -f "$PENANDA" ] && exit 0
cd /path/ke/docroot || exit 1
/usr/local/bin/php db/migrate.php || exit 1
/usr/local/bin/php db/seed.php --force || exit 1
touch "$PENANDA"
```

Pasang cron `* * * * *`, tunggu satu menit, baca lognya, lalu **hapus
cron-nya**. Inilah cara penyiapan server ini dilakukan.

---

## 4. Alur deploy rutin

```bash
# 1. Lokal: pastikan seluruh uji lulus
php db/migrate.php && php db/seed.php --force
bash uji-api.sh && node uji-crud.js && node uji-peran.js

# 2. Commit dan push ke cabang yang dipantau deployment
git add -A && git commit -m "…" && git push -u origin <cabang>

# 3. Picu deploy (cPanel Git Deployment, atau tool hosting)

# 4. Bila skema berubah, jalankan migrasi di server
php db/migrate.php

# 5. Verifikasi (§5)
```

Urutannya penting: **migrasi setelah deploy**, karena `db/schema.sql` yang baru
ikut terkirim oleh deploy.

---

## 5. Verifikasi

### 5.1 Commit yang terpasang

```bash
cat <docroot>/.git/HEAD        # harus sama dengan git rev-parse HEAD lokal
```

### 5.2 Berkas internal tidak boleh terbaca publik

Semua berikut **harus** menolak (403, 404, atau koneksi diputus):

```bash
for J in /.git/HEAD /.git/config /db/schema.sql /db/seed.php \
         /db/seed-data.json /db/seed-src/data.js \
         /api/config.php /api/lib/db.php /api/lib/rbac-matrix.php; do
  printf '%-32s %s\n' "$J" "$(curl -s -o /dev/null -w '%{http_code}' https://domain$J)"
done
```

Catatan: beberapa host memutus permintaan berkas `.sql` di tingkat WAF
sehingga curl melaporkan kode `000`. Itu penolakan yang lebih keras daripada
404, bukan kegagalan.

Dan ini **harus 404** karena berkasnya sudah dipindah ke `db/seed-src/`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://domain/assets/js/data.js
```

### 5.3 Header keamanan

```bash
curl -sI https://domain/index.html | grep -iE \
  'content-security-policy|x-frame-options|x-content-type-options|referrer-policy'
```

`script-src` **tidak boleh** memuat `'unsafe-inline'`.

### 5.4 API dan basis data

```bash
curl -s https://domain/api/health
# {"ok":true,"data":{"status":"ok","db":true,"time":"…"}}
```

`db: true` membuktikan sekaligus: rewrite `.htaccess` bekerja, PHP berjalan,
dan kredensial basis data benar.

### 5.5 Uji menyeluruh

Berkas uji lengkap ada di `/home/semestat/simaset-apitest.php` (di luar
docroot). Dijalankan dari dalam server terhadap URL publiknya, mencakup 111
pemeriksaan: berkas internal, header, autentikasi, bootstrap, CSRF, CRUD
penuh, nilai turunan, unggah foto berbahaya, injeksi SQL, RBAC untuk tiga
peran, dan persetujuan.

```bash
/usr/local/bin/php /home/semestat/simaset-apitest.php
# ######## RINGKASAN: LULUS=111 GAGAL=0 ########
```

Uji ini **membuat lalu menghapus** data uji (custodian, aset, work order,
risiko) dan **memutuskan satu permintaan persetujuan** yang masih menunggu.
Jalankan di lingkungan uji, atau terima perubahan kecil itu di lingkungan demo.

Bila lingkungan pengembangan tidak dapat menjangkau domain (mis. egress
diblokir), inilah satu-satunya cara memverifikasi penempatan secara sungguhan —
jangan menyimpulkan dari pemeriksaan berkas saja.

---

## 6. Rollback

```bash
git -C <docroot> reset --hard <commit-sebelumnya>
```

Bila skema berubah di antara dua commit, rollback kode **tidak** mengembalikan
skema. Pulihkan basis data dari cadangan lebih dulu, baru kodenya.

---

## 7. Pencadangan

Yang **wajib** dicadangkan dan tidak ada di git:

| Hal | Cara |
|---|---|
| Basis data | `mysqldump namadb > simaset-YYYYMMDD.sql` |
| Foto | arsipkan direktori `uploads/` |
| Konfigurasi | salin `api/config.php` ke tempat aman (memuat kredensial) |

Uji pemulihannya secara berkala — cadangan yang belum pernah dipulihkan belum
terbukti ada.

---

## 8. Masalah yang pernah terjadi

| Gejala | Sebab | Penanganan |
|---|---|---|
| Hanya 23 dari 40 tabel terbentuk, seed lalu gagal | `migrate.php` memecah `schema.sql` per `;\n` lalu membuang potongan yang dimulai `--`; karena setiap tabel didahului baris komentar, pernyataannya ikut terbuang | Komentar dibuang lebih dahulu, lalu dipecah per `;`; setiap tabel diverifikasi ada setelahnya |
| Kegagalan itu tidak terdeteksi saat uji lokal | Skema sudah lebih dulu dimuat lewat klien `mariadb`, sehingga hitungan tabel tampak benar | Uji migrasi **pada basis data yang benar-benar kosong** |
| `CREATE TABLE` gagal dengan galat sintaks dekat `sensitive` | `SENSITIVE` adalah reserved word MariaDB | Backtick **seluruh** identifier di DDL |
| Deployment menarik cabang yang salah | Deployment lama masih menunjuk cabang terdahulu | Hapus lalu daftarkan ulang deployment dengan cabang yang benar |
| Berkas uji ditolak saat diunggah ke server | Pemindai malware host memblokir string yang menyerupai web shell pada payload uji | Pakai byte non-gambar biasa sebagai payload; yang diuji tetap sama |
| `/db/schema.sql` dilaporkan "tidak tertolak" | Permintaan diputus WAF sehingga curl mengembalikan kode `000`, yang tidak termasuk daftar `[403,404]` pada asersi uji | Perlakukan `000` sebagai ditolak |

---

## 9. Daftar periksa setelah deploy

- [ ] `.git/HEAD` di server sama dengan commit lokal
- [ ] `php db/migrate.php` dijalankan bila skema berubah, dan keluar kode 0
- [ ] `/api/health` mengembalikan `db: true`
- [ ] `.git`, `db/`, `api/config.php`, `api/lib/` semuanya menolak
- [ ] `/assets/js/data.js` mengembalikan 404
- [ ] Header CSP terkirim dan `script-src` tanpa `'unsafe-inline'`
- [ ] `api/config.php` berizin `600`, `debug` bernilai `false`
- [ ] Masuk dengan satu akun demo berhasil dan dashboard terisi
- [ ] Satu peran terbatas (mis. Finance) hanya melihat menu yang seharusnya
- [ ] Uji menyeluruh §5.5 lulus
- [ ] **Bila akan dipakai dengan data sungguhan:** kata sandi demo sudah
      diganti dan pintasan akun demo dihapus dari `assets/js/login.js`
      ([SECURITY.md §5.1](../SECURITY.md#51-kredensial--wajib-pertama))
