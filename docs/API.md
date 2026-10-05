# API — SIMASET BMN

Seluruh komunikasi front-end dengan server melewati satu pintu masuk:
`api/index.php`. Rute `/api/*` diarahkan ke berkas itu oleh `api/.htaccess`.

Dokumen terkait: [Arsitektur](ARSITEKTUR.md) · [Hak Akses](HAK-AKSES.md) ·
[Data](DATA.md) · [Keamanan](../SECURITY.md)

---

## 1. Aturan umum

| Hal | Ketentuan |
|---|---|
| Format | JSON pada permintaan dan jawaban (`Content-Type: application/json`) |
| Sesi | Cookie `SIMASETSID` — `HttpOnly`, `Secure`, `SameSite=Lax`. Tidak terbaca JavaScript. |
| CSRF | Setiap `POST` / `PUT` / `PATCH` / `DELETE` wajib menyertakan header `X-CSRF-Token`. Pengecualian: `auth/login`. |
| Kredensial | `fetch` harus memakai `credentials: 'same-origin'` |
| Asal | Tidak ada CORS. Front-end dilayani dari domain yang sama. |
| Cache | Semua jawaban API `Cache-Control: no-store` |

### Bentuk jawaban

Berhasil:

```json
{ "ok": true, "data": { ... } }
```

Gagal:

```json
{ "ok": false, "error": "Pesan dalam bahasa Indonesia untuk pengguna." }
```

### Kode status yang dipakai

| Kode | Arti | Tindakan front-end |
|---|---|---|
| `200` | Berhasil | — |
| `401` | Belum masuk atau sesi berakhir | Alihkan ke halaman masuk |
| `403` | Peran tidak berwenang | Tampilkan pesan; jangan ulangi |
| `404` | Dataset atau baris tidak ditemukan | — |
| `405` | Metode tidak diizinkan pada rute itu | — |
| `409` | Bentrok (kunci ganda, permintaan sudah diputuskan) | Muat ulang data |
| `413` | Foto melebihi batas ukuran | Minta foto lebih kecil |
| `419` | Token CSRF tidak sah / kedaluwarsa | Muat ulang halaman |
| `422` | Masukan tidak valid | Tampilkan pesan pada formulir |
| `429` | Terlalu banyak percobaan masuk | Tampilkan pesan tunggu |
| `500` | Kesalahan server | Pesan umum; rincian hanya masuk log server |

> Pesan galat `500` sengaja tidak memuat rincian ketika `debug` bernilai
> `false` (nilai wajib di server), agar struktur basis data dan jalur berkas
> tidak terungkap. Rinciannya ditulis ke log galat PHP.

---

## 2. Autentikasi

### `POST /api/auth/login`

```json
{ "email": "admin@simaset.go.id", "password": "simaset123" }
```

Jawaban:

```json
{ "ok": true,
  "user": { "user_id": "USR-001", "name": "…", "email": "…", "role": "Super Admin", "unit": "…", "nip": "…" },
  "csrf": "64 karakter heksadesimal" }
```

Perilaku:

- Kata sandi diperiksa dengan `password_verify` terhadap hash di basis data.
- Verifikasi tetap dijalankan walau email tidak terdaftar, agar waktu
  tanggapan tidak membocorkan email mana yang ada.
- Pesan galat **sama** untuk kata sandi salah, email tidak ada, dan akun
  tidak aktif: `Email atau kata sandi tidak dikenali.`
- Hanya akun berstatus `Aktif` yang dapat masuk.
- `session_regenerate_id(true)` dipanggil setelah berhasil (cegah
  *session fixation*).
- Setiap percobaan dicatat ke `login_attempts`. Batas: **20 kegagalan per IP**
  dan **6 kegagalan per email** dalam 15 menit → `429`.

### `POST /api/auth/logout`

Menghapus sesi server dan membatalkan cookie. Perlu token CSRF.

### `GET /api/auth/me`

Mengembalikan `user` dan `csrf` bila sesi masih hidup, selain itu `401`.
Dipakai halaman masuk untuk melewati formulir bila pengguna sudah masuk.

---

## 3. Memuat data awal

### `GET /api/bootstrap`

Satu permintaan yang mengembalikan seluruh data yang boleh dibaca peran
pengguna. Dipakai `assets/js/boot.js` sebelum SPA dijalankan.

```json
{ "ok": true,
  "data": { "org": "…", "generated_at": "…",
            "assets": [ … ], "work_orders": [ … ], "…": [ … ],
            "governance": { "policy": [ … ], "objectives": [ … ], "…": [] } },
  "user": { … },
  "csrf": "…",
  "access": { "role": "Finance", "modules": ["dashboard","bmn-register", …] },
  "restricted": ["work_orders","inspections", …],
  "uploadDir": "uploads/photos" }
```

Hal penting:

- **Setiap** dataset selalu ada sebagai kunci. Dataset yang tidak boleh dibaca
  peran ini dikirim sebagai **array kosong**, dan namanya dicantumkan pada
  `restricted`. Front-end memakai itu untuk menyembunyikan kartu, bukan
  menampilkan angka nol yang menyesatkan.
- Kolom `password_hash` **tidak pernah** ikut (lihat `hidden` pada
  `api/lib/datasets.php`).

---

## 4. CRUD

| Metode | Rute | Kewenangan |
|---|---|---|
| `GET` | `/api/records/{dataset}` | `R` pada modul dataset |
| `GET` | `/api/records/{dataset}/{id}` | `R` |
| `POST` | `/api/records/{dataset}` | `RW` atau `A` |
| `PUT` | `/api/records/{dataset}/{id}` | `RW` atau `A` |
| `DELETE` | `/api/records/{dataset}/{id}` | `RW` atau `A` |

Nama dataset mengikuti kunci yang dipakai front-end, termasuk jalur bertitik
untuk governance (mis. `governance.improvement`). Peta dataset → tabel → modul
RBAC ada di [`api/lib/datasets.php`](../api/lib/datasets.php).

### Yang server tentukan sendiri

Kiriman klien untuk hal-hal berikut **diabaikan** dan dihitung ulang server:

| Hal | Keterangan |
|---|---|
| Kunci utama | Selalu dibuat server mengikuti pola per dataset (mis. `AST-2026-000063`). Nilai `asset_id` dari klien dibuang. |
| Kolom yang tidak ada di tabel | Dibuang tanpa suara (daftar putih dari `information_schema`) |
| Tipe & panjang nilai | Dikonversi dan dipotong sesuai definisi kolom |
| `bmn_uid`, `satker`, `kode_barang`, `nup` | Dihitung dari urutan dan master data |
| `category_code`, `sensitive` | Diturunkan dari kategori yang dipilih |
| `condition_label` | Diturunkan dari `condition_score` |
| `location_id`, `custodian_id`, `unit` | Dicari dari label/nama yang dipilih |
| `asset_name` | Diambil dari tabel `assets` |
| `score`, `level` (risiko) | `score = likelihood × consequence`, level dari ambang skor |
| `requestor`, `operator`, `uploaded_by`, `user` | Diambil dari sesi, bukan dari kiriman klien |
| Tanggal pencatatan | Diambil dari waktu server |
| `password_hash` | Dibuat dari kolom `password` (min. 10 karakter) lalu di-hash |

### Efek samping yang dijalankan server

- Membuat **aset** baru juga membuat **tag QR/Barcode**-nya, lalu mengisi
  `assets.tag_id`. Menghapus aset juga menghapus tagnya.
- Membuat **batch rekonsiliasi** juga membuat item pembandingnya dan mengisi
  `total_items` / `matched` / `exception`.

### Foto

Kolom `photo` pada `assets`, `work_orders` dan `inspections` menerima
**data URI** gambar (`image/jpeg`, `image/png`, `image/webp`). Server:

1. memeriksa polanya,
2. memeriksa bahwa isinya memang gambar (`getimagesizefromstring`),
3. **mendekode dan menyandikan ulang** dengan GD → seluruh metadata (termasuk
   GPS pada EXIF) terbuang dan berkas non-gambar tertolak,
4. menyimpan sebagai JPEG dengan nama 32 heksadesimal acak di
   `uploads/photos/`,
5. menyimpan **jalurnya saja** di basis data.

Mengirim `photo: null` menghapus foto beserta berkasnya. Mengirim kembali
jalur yang sudah ada (mis. saat hanya mengubah kolom lain) tidak mengubah apa
pun. SVG, URL `http(s)://`, dan jalur dengan `../` ditolak `422`.

---

## 5. Persetujuan

### `POST /api/approvals/{id}/decide`

```json
{ "status": "Disetujui" }
```

Hanya `Disetujui` atau `Ditolak`. Diperiksa, dalam urutan ini:

1. Peran sesi harus punya tingkat `A` pada modul `approval` **dan** pada modul
   yang diampu permintaan itu (`approvals.modul`).
2. `approvals.role_required` harus sama dengan peran sesi → selain itu `403`.
3. Statusnya harus masih `Menunggu` → selain itu `409`.
4. Nilai keputusan harus sah → selain itu `422`.

Otorisasi diperiksa **sebelum** validasi nilai, sehingga permintaan milik peran
lain menghasilkan `403`, bukan `422`.

---

## 6. Jejak audit

### `GET /api/audit-log?limit=100`

Memerlukan hak baca modul `audit`. Mengembalikan catatan terbaru:
waktu, email dan peran pelaku, aksi, dataset, id baris, dan IP.

Aksi yang dicatat: `login`, `login_failed`, `login_throttled`, `logout`,
`create`, `update`, `delete`, `approve`, dan `denied` (setiap penolakan hak
akses).

---

## 7. Status

### `GET /api/health`

Tidak memerlukan sesi. Mengembalikan `status`, `db` (boolean sambungan basis
data) dan `time`. Dipakai untuk memastikan rute `.htaccess` dan sambungan
basis data bekerja setelah deploy.
