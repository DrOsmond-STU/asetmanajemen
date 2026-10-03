# Panduan Pengembangan

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

## 1. Menyiapkan lingkungan

Tidak ada build step, bundler, atau dependensi npm untuk aplikasinya.

```bash
git clone https://github.com/DrOsmond-STU/asetmanajemen.git
cd asetmanajemen
python3 -m http.server 8080
```

Buka `http://localhost:8080/index.html`. Setelah menyunting berkas, cukup muat
ulang peramban (gunakan *hard reload* bila CSS/JS tampak tidak berubah).

Pengujian otomatis memerlukan Node.js dan Playwright (lihat §6).

---

## 2. Peta berkas

| Berkas | Isi | Sunting saat |
|---|---|---|
| `assets/js/rbac.js` | Matriks hak akses | Menambah peran/modul, mengubah kewenangan |
| `assets/js/modules.js` | Registri modul, label kolom, helper badge | Menambah modul atau kolom |
| `assets/js/data-ext.js` | Dataset tambahan | Menambah data contoh baru |
| `assets/js/app.js` | Router, perenderan, formulir, foto, RBAC | Menambah perilaku |
| `assets/css/style.css` | Design system | Menambah komponen tampilan |
| `assets/js/data.js` | Dataset inti (besar) | Sedapat mungkin **jangan** — pakai `data-ext.js` |

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

1. Tambahkan datanya ke `assets/js/data-ext.js`.
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
  build(v){
    return { kontrak_id: nextId(D.kontrak,'kontrak_id'), vendor:v.vendor, … };
  },
  successMsg:'Kontrak baru berhasil ditambahkan.',
},
```

Tipe field yang tersedia: `text`, `number`, `date`, `select`, `textarea`,
`photo`. Properti pendukung: `required`, `default` (nilai atau fungsi),
`options` (fungsi), `placeholder`, `min`, `max`, `step`, `full` (lebar penuh).

Field `photo` otomatis menyediakan tombol kamera/unggah, pratinjau, tombol
hapus, dan kompresi gambar — nilainya berupa data URI pada `v.photo`.

---

## 5. Konvensi kode

- **Bahasa:** komentar, label, dan pesan untuk pengguna dalam bahasa Indonesia.
  Istilah teknis mapan (Work Order, Asset Health Index) dipertahankan.
- **Escaping:** setiap nilai yang masuk ke HTML melewati `esc()`. Perenderan
  HTML mentah (`html:true`, `innerHTML`) hanya boleh menerima nilai dari
  validator — lihat [SECURITY.md §7](../SECURITY.md#7-praktik-pengembangan-aman).
- **Hak akses:** hanya lewat `canRead` / `canWrite` / `canApprove`. Jangan
  membandingkan nama peran langsung.
- **Pustaka:** host sendiri di `assets/js/vendor/`, jangan tambahkan CDN.
- **Timer dan grafik:** daftarkan lewat `addTimer()` dan `makeChart()` agar
  dibersihkan otomatis saat pindah halaman.
- **CSS:** pakai token yang ada (`--navy-900`, `--text-500`, `--surface-alt`,
  …). Jangan membuat variabel baru tanpa mendaftarkannya di `:root`.

---

## 6. Pengujian

Tidak ada kerangka uji formal; pengujian dilakukan dengan skrip Playwright
yang menjalankan aplikasi di peramban sungguhan. Pola yang dipakai selama ini:

```js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
// CDN font kerap diblokir di lingkungan tertutup — abaikan agar parsing tidak tertahan
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto('http://127.0.0.1:8080/index.html');
await p.waitForSelector('.demo-chip', { state: 'attached' });   // tanda data.js selesai dimuat
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
