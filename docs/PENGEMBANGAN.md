# Panduan Pengembangan

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

## 1. Menyiapkan lingkungan

Tidak ada build step, bundler, Composer, atau dependensi npm untuk
aplikasinya. Yang dibutuhkan: **PHP 7.4+** (dengan `pdo_mysql`, `gd`,
`mbstring`) dan **MySQL/MariaDB**.

```bash
git clone https://github.com/DrOsmond-STU/asetmanajemen.git
cd asetmanajemen

# Basis data
mysql -u root -e "CREATE DATABASE simaset CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Konfigurasi lokal (tidak ikut git)
cp api/config.sample.php api/config.php
```

Sunting `api/config.php` untuk pengembangan lokal:

```php
'debug'          => true,    // tampilkan pesan galat lengkap
'secure_cookies' => false,   // izinkan cookie sesi lewat HTTP
```

Lalu bangun tabel dan isi data contoh:

```bash
php db/migrate.php
php db/seed.php
```

### Menjalankan lokal

Server bawaan PHP tidak membaca `.htaccess`, sehingga rute `/api/*` perlu
router kecil. Simpan sebagai `router.php` (jangan di-commit):

```php
<?php
// Router untuk server bawaan PHP saja — menirukan aturan api/.htaccess.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if(preg_match('#^/api/?(.*)$#', $uri, $m)){
  $rute = $m[1] === 'index.php' ? '' : $m[1];
  $_GET['_route'] = $rute;
  require __DIR__ . '/api/index.php';
  return true;
}
return false;   // berkas statis dilayani apa adanya
```

```bash
php -S 127.0.0.1:8080 router.php
```

Buka `http://localhost:8080/index.html`. Setelah menyunting berkas front-end,
cukup muat ulang peramban (gunakan *hard reload* bila CSS/JS tampak tidak
berubah). Perubahan pada berkas PHP langsung berlaku pada permintaan
berikutnya.

Pengujian otomatis memerlukan Node.js dan Playwright (lihat §6).

---

## 2. Peta berkas

### Front-end

| Berkas | Isi | Sunting saat |
|---|---|---|
| `assets/js/rbac.js` | **Sumber** matriks hak akses | Menambah peran/modul, mengubah kewenangan — lalu jalankan `node db/gen-rbac.js` |
| `assets/js/modules.js` | Registri modul, label kolom, helper badge | Menambah modul atau kolom |
| `assets/js/app.js` | Router, perenderan, formulir, CRUD, foto | Menambah perilaku |
| `assets/js/api.js` | Klien API | Menambah endpoint baru |
| `assets/js/boot.js` | Memuat data lalu menjalankan SPA | Hampir tidak perlu |
| `assets/css/style.css` | Design system | Menambah komponen tampilan |

### Backend

| Berkas | Isi | Sunting saat |
|---|---|---|
| `api/index.php` | Rute API | Menambah endpoint |
| `api/lib/datasets.php` | Peta dataset → tabel, modul, pola ID | Menambah dataset |
| `api/lib/records.php` | Validasi, nilai turunan, CRUD | Menambah aturan turunan |
| `api/lib/rbac.php` | Penegakan hak akses | Hampir tidak perlu |
| `api/lib/rbac-matrix.php` | **Dibangkitkan** — jangan disunting manual | — |
| `api/lib/photos.php` | Penanganan foto | Mengubah aturan unggah |

### Basis data

| Berkas | Isi | Sunting saat |
|---|---|---|
| `db/schema.sql` | DDL 40 tabel | Menambah/mengubah tabel — **backtick semua identifier** |
| `db/seed-src/data-ext.js` | Dataset contoh tambahan | Menambah data contoh |
| `db/seed-src/data.js` | Dataset contoh inti (besar) | Sedapat mungkin **jangan** — pakai `data-ext.js` |
| `db/seed.php` | Seeder | Menambah dataset ke urutan pengisian |

---

## 3. Menambah modul baru

### 3.1 Modul tabel generik

Cukup satu objek konfigurasi — tidak perlu menulis halaman.

```js
// assets/js/modules.js, di dalam const MODULES = { … }
'kontrak': {
  group:'register',                    // harus salah satu id pada NAV_GROUPS
  title:'Manajemen Kontrak',
  icon:'fileCheck',                    // kunci pada ICONS (assets/js/icons.js)
  desc:'Kontrak pengadaan dan pemeliharaan aset.',
  dataset:'kontrak',                   // nama array pada SIMASET_DATA
  idKey:'kontrak_id',
  searchKeys:['kontrak_id','vendor','asset_name'],
  filters:[{key:'status', label:'Status'}],
  columns:[
    {key:'kontrak_id', label:'ID', cls:'cell-mono'},
    {key:'vendor', label:'Vendor', cls:'cell-strong'},
    {key:'nilai', label:'Nilai'},
    {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
  ],
  kpis:(rows)=>[
    {label:'Total Kontrak', value:rows.length, icon:'fileCheck', tint:'blue'},
  ],
},
```

Lalu **wajib**:

1. Tambahkan tabelnya ke `db/schema.sql`, jalankan `php db/migrate.php`,
   lalu daftarkan dataset-nya di `DATASETS()` pada `api/lib/datasets.php`.
2. Tambahkan data contohnya ke `db/seed-src/data-ext.js`, jalankan
   `node db/export-seed.js`, lalu `php db/seed.php --force`.
2. Tambahkan id modul ke `RBAC_MODULES` pada `rbac.js`.
3. Beri kewenangan pada peran yang relevan di `ROLE_ACCESS` — modul tanpa
   entri tidak akan tampil untuk siapa pun.
4. Tambahkan label kolom ke `FIELD_LABELS` pada `modules.js` agar laci detail
   menampilkan nama yang ramah.
5. Daftarkan modul pada [MODUL.md](MODUL.md) dan matriks di [HAK-AKSES.md](HAK-AKSES.md).

### 3.2 Modul dengan tata letak khusus

Beri `custom:'kontrak'` pada konfigurasi, tulis `function renderKontrak()` di
`app.js`, lalu daftarkan di `route()`:

```js
if(cfg.custom==='kontrak') return renderKontrak();
```

Renderer khusus **wajib** menghormati hak akses sendiri, misalnya:

```js
const writable = canWrite('kontrak');
… ${writable ? `<button class="btn btn-primary btn-sm" id="kontrak-add">…</button>` : readOnlyBadge()}
const btn = qs('#kontrak-add');
if(btn) btn.addEventListener('click', ()=> openAddForm('kontrak'));
```

Pola `const btn = qs(...); if(btn) …` penting: tombol tidak ada untuk peran
baca-saja, dan `addEventListener` pada `null` akan melempar galat.

---

## 4. Menambah formulir

Tambahkan entri pada `FORM_CONFIGS` di `app.js`. Kuncinya harus **sama dengan
id modul** agar tombol *Tambah Baru* otomatis muncul.

```js
'kontrak': {
  title:'Tambah Kontrak', dataset:'kontrak',
  fields:[
    {key:'vendor', label:'Vendor', type:'text', required:true},
    {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
    {key:'nilai', label:'Nilai (Rp)', type:'number', min:0},
    {key:'mulai', label:'Tanggal Mulai', type:'date', default:todayStr},
    {key:'catatan', label:'Catatan', type:'textarea', full:true},
    {key:'photo', label:'Foto Dokumen', type:'photo', full:true},
  ],
  // build() hanya mengembalikan nilai yang DIISI PENGGUNA. Kunci utama dan
  // nilai turunan dihitung server; mengirimkannya dari sini sia-sia karena
  // akan diabaikan.
  build(v){
    return { vendor:v.vendor, asset_id:v.asset_id, nilai:v.nilai, … };
  },
  successMsg:'Kontrak baru berhasil ditambahkan.',
},
```

Tipe field yang tersedia: `text`, `number`, `date`, `password`, `select`,
`textarea`, `photo`. Properti pendukung: `required`, `default` (nilai atau
fungsi), `options` (fungsi), `placeholder`, `min`, `max`, `step`, `full`
(lebar penuh).

Field `photo` otomatis menyediakan tombol kamera/unggah, pratinjau, tombol
hapus, dan kompresi gambar — nilainya berupa data URI pada `v.photo`, dan
server menyandikannya ulang menjadi berkas.

### Bagaimana formulir tersimpan

Satu drawer dipakai untuk tambah maupun ubah (`openRecordForm`), dan ia
memanggil API:

```
openAddForm(kind)                 openEditForm(kind, id, row, onDone)
        │                                     │
        └──────────── openRecordForm ─────────┘
                           │
                 collectForm()  → cfg.build(values)
                           │
          apiCreate(dataset, nilai)   atau   apiUpdate(dataset, id, nilai)
                           │
                 cacheInsert/cacheReplace → draw()
```

Yang perlu diingat saat menambah formulir:

| Hal | Ketentuan |
|---|---|
| Kunci `FORM_CONFIGS` | Harus sama dengan id modul agar tombol otomatis muncul. Bila berbeda, daftarkan pada `FORM_MODULE` supaya pemeriksaan hak aksesnya menunjuk modul yang benar |
| `dataset` | Harus terdaftar di `DATASETS()` pada `api/lib/datasets.php` |
| Nilai turunan | Hitung di `applyDerived()` (PHP), **bukan** di `build()` |
| Efek samping | Letakkan di `afterCreate()` (PHP). Bila efeknya mengubah dataset lain, panggil `refreshDataset()` lewat `afterSave` agar tampilan ikut mutakhir |
| Kolom milik server | Daftarkan pada `server` di registry supaya kiriman klien diabaikan |

### Tombol Ubah dan Hapus

Untuk modul yang memakai `mountListPage`, kolom aksi muncul otomatis bila
peran berwenang dan modulnya punya `FORM_CONFIGS`.

Untuk modul dengan tabel buatan sendiri, panggil setelah tabel dirender:

```js
attachRowActions('#sensus-body', 'sensus-plan', 'sensus_id', renderSensus);
//               tbody           kunci form     kolom id     fungsi render ulang
```

Syaratnya: `<tbody>` punya `id`, dan setiap `<tr>` punya `data-id`.

---

## 5. Konvensi kode

- **Bahasa:** komentar, label, dan pesan untuk pengguna dalam bahasa Indonesia.
  Istilah teknis mapan (Work Order, Asset Health Index) dipertahankan.
- **Escaping:** setiap nilai yang masuk ke HTML melewati `esc()`. Perenderan
  HTML mentah (`html:true`, `innerHTML`) hanya boleh menerima nilai dari
  validator — lihat [SECURITY.md §7](../SECURITY.md#7-aturan-pengembangan).
- **Hak akses:** hanya lewat `canRead` / `canWrite` / `canApprove`. Jangan
  membandingkan nama peran langsung.
- **Pustaka:** host sendiri di `assets/js/vendor/`, jangan tambahkan CDN.
- **Timer dan grafik:** daftarkan lewat `addTimer()` dan `makeChart()` agar
  dibersihkan otomatis saat pindah halaman.
- **CSS:** pakai token yang ada (`--navy-900`, `--text-500`, `--surface-alt`,
  …). Jangan membuat variabel baru tanpa mendaftarkannya di `:root`.

---

## 6. Pengujian

Tidak ada kerangka uji formal. Pengujian dilakukan dengan lima rangkaian
skrip, dan seluruhnya harus lulus sebelum deploy:

| Rangkaian | Alat | Jumlah | Yang diuji |
|---|---|---|---|
| API | bash + curl | 90 | Autentikasi, CSRF, CRUD, masukan tak dipercaya, RBAC, persetujuan, pembatas login |
| CRUD peramban | Playwright | 30 | Tambah/ubah/hapus nyata, persistensi setelah muat ulang, foto |
| 10 peran | Playwright | 40 | Menu sama dengan matriks, setiap modul dibuka, tanpa galat JS, modul terlarang ditolak |
| Tabel modul khusus | Playwright | 15 | Ubah/hapus pada sensus, rekonsiliasi, siber, governance |
| Keamanan | bash + curl | 19 | Unggah foto berbahaya, injeksi SQL, traversal, kolom tersembunyi |

Ditambah **111 pemeriksaan di server sungguhan** yang dijalankan dari dalam
server terhadap URL publiknya (lihat [DEPLOY.md §5.5](DEPLOY.md#55-uji-menyeluruh)).

Tiga hal yang membuat rangkaian uji dapat dipercaya:

1. **Seed ulang sebelum setiap rangkaian.** `php db/seed.php --force` agar
   hasilnya tidak bergantung pada sisa uji sebelumnya.
2. **Kosongkan `login_attempts`.** Uji sengaja membuat login gagal; tanpa ini
   rangkaian akan memicu pembatasnya sendiri setelah beberapa kali jalan.
3. **Uji migrasi pada basis data yang benar-benar kosong.** Pernah terjadi
   migrasi hanya membuat 23 dari 40 tabel dan tidak terdeteksi karena skema
   sudah lebih dulu dimuat lewat klien `mariadb`.

Pola skrip Playwright yang dipakai:

```js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
// CDN font kerap diblokir di lingkungan tertutup — abaikan agar parsing tidak tertahan
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto('http://127.0.0.1:8080/index.html');
await p.waitForSelector('#demo-list .demo-chip', { state: 'attached' });  // chip di dalam <details> tertutup
await p.waitForSelector('.kpi-card', { timeout: 20000 });                 // tanda /api/bootstrap selesai
await p.fill('#email', 'admin@simaset.go.id');
await p.fill('#password', 'simaset123');
await p.click('#login-btn');
await p.waitForSelector('.nav-item');
```

Catatan penting dari pengalaman:

- Tunggu `.demo-chip` (`state:'attached'`, karena berada di dalam `<details>`
  yang tertutup) sebelum menekan tombol masuk — menekan terlalu dini membuat
  formulir ter-submit sebelum penangannya terpasang.
- Jangan memakai `waitForURL` untuk halaman aplikasi; permintaan font yang
  menggantung membuat *load event* tidak pernah selesai.

**Yang wajib diuji ulang setelah mengubah RBAC, menu, atau tombol aksi:**

1. Untuk setiap peran: jumlah menu sesuai matriks, tidak ada menu bocor
   maupun hilang.
2. Setiap modul yang diizinkan benar-benar terbuka (bukan *Akses Ditolak*).
3. Setiap modul terlarang menampilkan *Akses Ditolak* saat alamatnya diketik.
4. Tingkat `R` tidak memunculkan kontrol ubah; tingkat `RW`/`A` memunculkannya.
5. Tombol setujui hanya muncul pada peran bertingkat `A`.
6. Tidak ada galat JavaScript (`page.on('pageerror')`).

---

## 7. Alur kerja Git

- Pengembangan pada branch `claude/asset-management-ui-prototype-xum2vt`
  (branch default repositori).
- Pesan commit dalam bahasa Indonesia, menjelaskan **apa** dan **mengapa**.
- Setelah commit dan push, jalankan deployment — lihat [DEPLOY.md](DEPLOY.md).
- Perbarui dokumentasi yang terdampak pada commit yang sama: perubahan modul
  → [MODUL.md](MODUL.md); perubahan kewenangan → [HAK-AKSES.md](HAK-AKSES.md);
  perubahan keamanan → [SECURITY.md](../SECURITY.md) dan
  [CHANGELOG.md](../CHANGELOG.md).
