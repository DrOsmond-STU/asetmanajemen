# Arsitektur — SIMASET BMN

Dokumen terkait: [README](../README.md) · [API](API.md) · [Data](DATA.md) ·
[Hak Akses](HAK-AKSES.md) · [Keamanan](../SECURITY.md) ·
[Pengembangan](PENGEMBANGAN.md)

---

## 1. Gambaran umum

```
┌─────────────────────── PERAMBAN ───────────────────────┐
│                                                        │
│  index.html ─── icons.js, rbac.js, api.js, login.js    │
│       │                                                │
│       │ POST /api/auth/login                           │
│       ▼                                                │
│  app/index.html                                        │
│       ├── vendor: Chart.js, qrcode, JsBarcode          │
│       ├── icons.js    set ikon SVG                     │
│       ├── rbac.js     matriks hak akses (untuk tampilan)│
│       ├── api.js      klien API: sesi, CSRF, galat     │
│       ├── modules.js  registri 26 modul + dashboard    │
│       ├── app.js      router, render, formulir, CRUD   │
│       └── boot.js     memuat data lalu startSimaset()  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS, cookie HttpOnly
                            │ X-CSRF-Token pada tulis
┌───────────────────────────▼────────────────────────────┐
│                      SERVER (PHP)                      │
│                                                        │
│  .htaccess        header keamanan, CSP, tolak .git/db  │
│  api/.htaccess    seluruh /api/* -> api/index.php      │
│                                                        │
│  api/index.php    front controller: rute + otorisasi   │
│     ├── lib/auth.php      sesi, CSRF, pembatas, audit  │
│     ├── lib/rbac.php      requireRead/Write/Approve    │
│     ├── lib/datasets.php  dataset -> tabel, modul, ID  │
│     ├── lib/records.php   CRUD, validasi, nilai turunan│
│     ├── lib/photos.php    periksa + sandikan ulang foto│
│     └── lib/db.php        PDO, prepared statements     │
└───────────────────────────┬────────────────────────────┘
                            │
                 ┌──────────▼──────────┐    ┌───────────────┐
                 │   MariaDB 40 tabel  │    │ uploads/photos│
                 └─────────────────────┘    └───────────────┘
```

Tanpa kerangka kerja, tanpa langkah bangun, tanpa `node_modules` di server.
Front-end adalah HTML/CSS/JS biasa; backend adalah PHP biasa.

---

## 2. Urutan muat dan mengapa urutannya penting

### Halaman masuk (`index.html`)

| # | Berkas | Menyediakan | Bergantung pada |
|---|---|---|---|
| 1 | `icons.js` | `ICONS`, `icon()` | — |
| 2 | `rbac.js` | `RBAC`, `ROLE_DEFS` | — |
| 3 | `api.js` | `API` | — |
| 4 | `login.js` | logika formulir | ketiganya di atas |

`data.js` **tidak lagi dimuat di sini.** Dahulu halaman masuk memuat seluruh
dataset — termasuk daftar akun dan kata sandinya — hanya untuk mencocokkan
kata sandi di peramban. Sekarang pencocokan dilakukan server.

### Aplikasi (`app/index.html`)

| # | Berkas | Menyediakan | Bergantung pada |
|---|---|---|---|
| 1 | vendor | `Chart`, `qrcode`, `JsBarcode` | — |
| 2 | `icons.js` | `ICONS`, `icon()` | — |
| 3 | `rbac.js` | `RBAC` untuk menu & tombol | — |
| 4 | `api.js` | `API` | — |
| 5 | `modules.js` | `MODULES`, `NAV_GROUPS`, pemformat | `icon()` |
| 6 | `app.js` | **mendefinisikan** `window.startSimaset` | semua di atas |
| 7 | `boot.js` | memanggil `/api/bootstrap` lalu `startSimaset()` | `API`, `app.js` |

`app.js` **tidak lagi berjalan sendiri saat dimuat.** Dahulu berkas itu sebuah
IIFE yang langsung membaca `SIMASET_DATA`. Sekarang ia hanya mendefinisikan
sebuah fungsi; `boot.js` yang menjalankannya setelah data tiba. Inilah yang
memungkinkan seluruh kode render lama dipakai tanpa diubah.

---

## 3. Alur satu permintaan

```
Pengguna menekan "Simpan" pada formulir
        │
        ▼
app.js  openRecordForm()  → collectForm() → cfg.build(values)
        │                    (hanya nilai yang diisi pengguna)
        ▼
api.js  API.create(dataset, values)
        │  fetch POST /api/records/{dataset}
        │  credentials: 'same-origin'  +  X-CSRF-Token
        ▼
api/index.php
        ├── requireCsrf()                  → 419 bila tidak cocok
        ├── requireLogin()                 → 401 bila sesi habis
        ├── datasetConf(dataset)           → 404 bila tidak dikenal
        ├── requireWrite(conf.module)      → 403 bila tidak berwenang
        └── createRecord()
              ├── filterInput()    daftar putih kolom dari information_schema
              ├── applyDerived()   nilai turunan + nilai dari sesi
              ├── storePhotoDataUri()  bila ada foto
              ├── nextRecordId()   kunci utama dibuat server
              ├── INSERT (prepared)   coba ulang bila kunci bentrok
              ├── afterCreate()    efek samping (tag QR, item rekonsiliasi)
              └── auditLog('create', …)
        │
        ▼
Jawaban { ok: true, data: baris lengkap dari basis data }
        │
        ▼
app.js  cacheInsert() menyisipkan baris ke salinan dalam memori
        → draw() menggambar ulang tabel tanpa memuat ulang halaman
```

Yang perlu diperhatikan: **jawaban yang dipakai front-end adalah baris
sebagaimana tersimpan di basis data**, bukan objek yang dikirim klien. Dengan
begitu nilai yang dihitung server (ID, `bmn_uid`, `score`, `asset_name`)
langsung terlihat benar di tabel.

---

## 4. Salinan data dalam memori

`boot.js` menaruh seluruh data pada `window.SIMASET_DATA`, dan `app.js`
membacanya lewat `const D = window.SIMASET_DATA`.

Setelah operasi tulis, salinan itu disegarkan **tanpa mengganti acuan array**:

| Fungsi | Yang dilakukan |
|---|---|
| `cacheInsert(dataset, baris)` | `arr.push(baris)` |
| `cacheReplace(dataset, id, baris)` | mengganti elemen pada indeks yang cocok |
| `cacheRemove(dataset, id)` | `arr.splice(i, 1)` |
| `refreshDataset(dataset)` | `arr.length = 0` lalu `arr.push(...baru)` |

Acuan array dipertahankan karena `mountListPage` menyimpan `const rows = D[...]`
saat halaman dirender. Mengganti `D[...]` dengan array baru akan membuat tabel
menampilkan data lama; memutasi array yang sama membuatnya langsung mengikuti.

`refreshDataset` dipakai untuk efek samping server: setelah aset dibuat, tag
QR-nya dibuat server sehingga `asset_tags` perlu dimuat ulang.

---

## 5. Dataset yang tidak boleh dibaca

`GET /api/bootstrap` selalu mengirim **setiap** kunci dataset, tetapi yang
tidak boleh dibaca peran itu berisi array kosong, dan namanya dicantumkan pada
`restricted`.

Front-end memakai itu untuk **menyembunyikan**, bukan menampilkan nol:

- Kartu KPI dashboard menyebut modul sumbernya dan disaring `canRead()`.
- Kartu grafik hanya dirender bila modulnya boleh dibaca; `makeChart` dilewati
  bila canvasnya tidak ada.
- Baris ringkasan kepatuhan disaring satu per satu.
- Garis waktu aktivitas hanya menggabungkan sumber yang boleh dibaca, dan
  menampilkan keterangan bila kosong.
- Pembagi dijaga: `avgAHI` menjadi `—` bila `asset_kpis` kosong, bukan `NaN`.

Alasannya sederhana: "0 work order" dan "Anda tidak berhak melihat work order"
adalah dua pernyataan berbeda, dan hanya satu yang benar.

---

## 6. Keputusan teknis dan alasannya

| Keputusan | Alasan |
|---|---|
| **Nama kolom = kunci JSON front-end** | API memetakan baris 1:1 tanpa lapisan penerjemah, sehingga ~2.500 baris kode render purwarupa dipakai apa adanya |
| **Satu `bootstrap` alih-alih banyak `GET` per modul** | Purwarupa membaca data lintas modul di banyak tempat (dashboard, lifecycle, pencarian global). Satu permintaan jauh lebih sederhana daripada mengubah setiap pembacaan menjadi asinkron |
| **Tipe kolom dibaca dari `information_schema`** | Menulis ulang tipe di registry berarti dua sumber kebenaran yang dapat menyimpang. Membacanya dari basis data membuat validasi selalu cocok dengan skema |
| **Matriks RBAC server dibangkitkan dari `rbac.js`** | Satu sumber kebenaran. Menyalin manual cepat atau lambat akan berbeda, dan perbedaannya adalah lubang keamanan |
| **Kunci utama dibuat server** | Klien tidak boleh memilih identitas baris. Benturan ditangani dengan coba-ulang pada galat kunci ganda |
| **Foto disandikan ulang, bukan disimpan apa adanya** | Membuang metadata (termasuk GPS) sekaligus memastikan berkas yang tersimpan benar-benar gambar |
| **Jalur foto di basis data, berkas di disk** | Data URI di basis data membuat setiap baris berukuran ratusan kilobyte dan mustahil disajikan dengan cache |
| **Seluruh identifier SQL di-backtick** | `SENSITIVE` ternyata reserved word di MariaDB. Daftar reserved word berubah antar versi; membacktick semuanya menghilangkan seluruh kelas masalah ini |
| **PHP 7.4 sebagai target** | Versi PHP server tidak dapat dipastikan tanpa akses HTTP saat pengembangan, jadi sintaks khas PHP 8 (`match`, `str_starts_with`) dihindari. Server ternyata 8.3 — kodenya tetap berjalan |
| **`api/config.php` tidak ikut git** | Deploy memakai `git reset --hard` yang tidak menyentuh berkas tak terlacak, sehingga kredensial aman dari deploy sekaligus tidak pernah masuk repositori |
| **Pustaka pihak ketiga di-host sendiri** | Tidak ada permintaan ke pihak ketiga saat aplikasi dipakai; CSP dapat dibuat ketat |
| **Skrip sebaris dipindah ke berkas** | Memungkinkan CSP `script-src 'self'` tanpa `'unsafe-inline'`, yang membuat CSP benar-benar berguna melawan XSS |

---

## 7. Peran berkas

### Front-end

| Berkas | Tanggung jawab |
|---|---|
| `assets/js/icons.js` | 52 ikon SVG sebaris; `icon(nama, kelas)` |
| `assets/js/rbac.js` | **Sumber kebenaran** matriks hak akses; dipakai tampilan dan dibangkitkan menjadi versi PHP |
| `assets/js/api.js` | Satu-satunya tempat `fetch` dipanggil; mengelola token CSRF dan membungkus galat menjadi `ApiError` |
| `assets/js/login.js` | Formulir masuk, pintasan akun demo, pesan galat |
| `assets/js/boot.js` | Memuat data, menangani sesi habis, menjalankan SPA |
| `assets/js/modules.js` | `MODULES` (judul, kolom, filter, KPI per modul), `NAV_GROUPS`, pemformat dan lencana |
| `assets/js/app.js` | Router hash, seluruh renderer modul, formulir, CRUD, foto, ekspor |
| `assets/css/style.css` | Token warna/jarak, tata letak, komponen |

### Backend

| Berkas | Tanggung jawab |
|---|---|
| `api/index.php` | Rute dan urutan pemeriksaan: CSRF → sesi → dataset → hak akses → operasi |
| `api/lib/db.php` | Koneksi PDO; `ident()` sebagai jaring pengaman nama kolom |
| `api/lib/respond.php` | Bentuk jawaban JSON, pembacaan badan permintaan |
| `api/lib/auth.php` | Sesi, CSRF, pembatas percobaan masuk, `auditLog`, `publicUser` |
| `api/lib/rbac.php` | `requireRead` / `requireWrite` / `requireApprove` |
| `api/lib/rbac-matrix.php` | **Dibangkitkan** — jangan disunting manual |
| `api/lib/datasets.php` | Peta 37 dataset → tabel, modul RBAC, pola ID, kolom milik server, kolom tersembunyi; introspeksi `information_schema` |
| `api/lib/records.php` | Konversi tipe, daftar putih, nilai turunan, CRUD, efek samping |
| `api/lib/photos.php` | Validasi, penyandian ulang, penyimpanan dan penghapusan foto |

### Basis data dan alat

| Berkas | Tanggung jawab |
|---|---|
| `db/schema.sql` | DDL 40 tabel |
| `db/migrate.php` | Menjalankan DDL **dan memverifikasi** setiap tabel terbentuk |
| `db/seed.php` | Mengisi data contoh; `--force` mengosongkan dulu |
| `db/seed-data.json` | Data contoh dalam JSON agar seeder tidak perlu Node |
| `db/seed-src/` | Sumber data contoh (berkas JS asal purwarupa) |
| `db/export-seed.js` | `seed-src/` → `seed-data.json` |
| `db/gen-rbac.js` | `assets/js/rbac.js` → `api/lib/rbac-matrix.php` |

---

## 8. Yang sengaja tidak dilakukan

- **Tidak ada ORM.** Dataset bersifat seragam dan CRUD-nya generik; ORM akan
  menambah lapisan tanpa menambah kejelasan.
- **Tidak ada kerangka kerja front-end.** Purwarupa sudah berjalan dengan
  router hash dan template string; menggantinya berarti menulis ulang seluruh
  tampilan tanpa manfaat bagi pengguna.
- **Tidak ada langkah bangun.** Berkas yang ada di repositori sama dengan yang
  disajikan server; tidak ada selisih antara yang dibaca dan yang berjalan.
- **Tidak ada `GET` per modul saat berpindah halaman.** Data sudah ada di
  memori; pembacaan ulang hanya dilakukan setelah tulis yang punya efek
  samping di server.
