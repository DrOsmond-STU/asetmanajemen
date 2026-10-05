# Data & Penyimpanan — SIMASET BMN

Dokumen terkait: [Arsitektur](ARSITEKTUR.md) · [API](API.md) ·
[Modul](MODUL.md) · [Keamanan](../SECURITY.md)

---

## 1. Di mana data berada

| Jenis | Lokasi | Sifat |
|---|---|---|
| **Seluruh data aplikasi** | Basis data MariaDB, 40 tabel | Dibaca dan ditulis lewat API; satu-satunya sumber kebenaran |
| **Foto aset & bukti** | Berkas di `uploads/photos/` | Nama 32 heks acak, selalu `.jpg`; basis data menyimpan jalurnya |
| **Data contoh (seed)** | `db/seed-data.json`, sumbernya `db/seed-src/` | Hanya dipakai `db/seed.php`; **tidak** disajikan web server |
| **Kredensial basis data** | `api/config.php` di server | Tidak ikut git, izin `600` |
| **Sesi pengguna** | Sesi server + cookie `SIMASETSID` | `HttpOnly`; tidak ada data pengguna di penyimpanan peramban |

Tidak ada lagi data aplikasi di `localStorage` maupun `sessionStorage`. Pada
v2.x catatan baru, foto, dan keputusan persetujuan disimpan di peramban; semua
itu kini berada di basis data.

---

## 2. Skema basis data

40 tabel. Nama kolom **sengaja dibuat sama** dengan kunci JSON yang dipakai
front-end, sehingga API memetakan baris 1:1 tanpa lapisan penerjemah.

DDL lengkap: [`db/schema.sql`](../db/schema.sql).

### Master data

| Tabel | Kunci | Baris contoh | Isi |
|---|---|---|---|
| `app_meta` | `k` | 2 | `org`, `generated_at` |
| `buildings` | `id` | 7 | Gedung |
| `locations` | `location_id` | 42 | Titik lokasi (gedung/lantai/ruang) |
| `units` | `id` (pengganti) | 11 | Unit kerja — pada data purwarupa berupa array string |
| `categories` | `code` | 6 | Kategori aset + contoh (kolom JSON) |
| `custodians` | `custodian_id` | 16 | Penanggung jawab aset |

### Register & tagging

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `assets` | `asset_id` | 62 | Memuat `photo`, `sensitive`, identitas BMN ganda |
| `asset_tags` | `tag_id` | 62 | Dibuat server otomatis untuk setiap aset baru |

### Operasional lapangan

| Tabel | Kunci | Baris |
|---|---|---|
| `sensus_plans` | `sensus_id` | 6 |
| `sensus_items` | `item_id` | 284 |
| `mutasi` | `request_id` | 14 |
| `jml_events` | `event_id` | 12 |

### Pemeliharaan & kondisi

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `work_orders` | `wo_id` | 28 | Memuat `photo` bukti pekerjaan |
| `inspections` | `inspection_id` | 20 | Memuat `photo` kondisi + 6 skor penilaian |

### Risiko, kinerja, biaya

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `risks` | `risk_id` | 18 | `score` dan `level` dihitung server |
| `asset_kpis` | `kpi_id` | 30 | Availability, MTBF, MTTR, utilization, AHI |
| `costs` | `cost_id` | 70 | Lifecycle cost per jenis |

### Kepatuhan BMN

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `recon_batches` | `batch_id` | 3 | Hitungan match/exception diisi server |
| `recon_items` | `item_id` | 60 | Dibuat server saat batch baru dibuat |
| `disposals` | `disposal_id` | 9 | |

### Keamanan siber

| Tabel | Kunci | Baris |
|---|---|---|
| `cyber_assets` | `cyber_asset_id` | 4 |
| `access_logs` | `log_id` | 24 |
| `sanitizations` | `sanitization_id` | 9 |

### Governance & audit

Objek `governance` pada front-end dipecah menjadi enam tabel:

| Tabel | Kunci | Baris |
|---|---|---|
| `gov_policy` | `id` | 1 |
| `gov_objectives` | `id` | 4 |
| `gov_samp` | `id` | 1 |
| `gov_amp` | `id` | 1 |
| `gov_management_review` | `id` | 3 |
| `gov_improvement` | `id` | 3 |
| `audits` | `audit_id` | 8 |
| `documents` | `document_id` | 25 |
| `reports` | `report_id` | 8 |

### IoT & integrasi

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `iot_devices` | `device_id` | 10 | |
| `iot_alerts` | `alert_id` | 6 | |
| `integrations` | `id` (pengganti) | 7 | `system` unik; data purwarupa tidak punya kunci alami |
| `sync_logs` | `log_id` | 7 | |

### Pengguna & keamanan

| Tabel | Kunci | Baris | Catatan |
|---|---|---|---|
| `users` | `user_id` | 15 | `password_hash` **tidak pernah** keluar lewat API |
| `approvals` | `approval_id` | 8 | `decided_by`, `decided_at` diisi saat diputuskan |
| `audit_log` | `id` | tumbuh | Setiap create/update/delete/approve/denied/login |
| `login_attempts` | `id` | tumbuh | Dasar pembatasan percobaan masuk |

**Total data contoh: 904 baris.**

---

## 3. Registry dataset

[`api/lib/datasets.php`](../api/lib/datasets.php) memetakan 37 nama dataset
(termasuk enam jalur `governance.*`) ke:

| Kunci | Arti |
|---|---|
| `table` | Nama tabel |
| `pk` | Kolom kunci utama |
| `module` | Modul RBAC yang mengatur dataset ini |
| `prefix`, `width` | Pola ID baru; `{Y}` diganti tahun berjalan. `null` = AUTO_INCREMENT |
| `server` | Kolom yang hanya boleh diisi server — kiriman klien diabaikan |
| `hidden` | Kolom yang tidak pernah ikut pada respons API |
| `scalar` | Untuk dataset yang front-end lihat sebagai array string (`units`) |

**Tipe dan panjang kolom tidak ditulis di sini.** Semuanya dibaca dari
`information_schema` oleh `tableColumns()`, sehingga validasi tidak mungkin
menyimpang dari `db/schema.sql`.

### Pola ID yang dipakai

| Dataset | Pola | Contoh |
|---|---|---|
| `assets` | `AST-{tahun}-NNNNNN` | `AST-2026-000063` |
| `asset_tags` | `TAG-NNNNNN` | `TAG-000063` |
| `custodians` | `CUST-NNN` | `CUST-017` |
| `work_orders` | `WO-{tahun}-NNNN` | `WO-2026-0029` |
| `risks` | `RISK-{tahun}-NNN` | `RISK-2026-019` |
| `users` | `USR-NNN` | `USR-016` |

Nomor berikutnya diambil dari `MAX` urutan yang sudah ada untuk pola yang sama.
Benturan pada permintaan bersamaan terdeteksi basis data dan dicoba ulang
hingga lima kali.

---

## 4. Penanganan foto

### Saat mengunggah

1. Peramban mengompres gambar lewat `<canvas>` (maks. 1024 px, JPEG 0.72) dan
   mengirimnya sebagai data URI pada kolom `photo`.
2. Server memeriksa pola, memastikan isinya memang gambar, lalu
   **mendekode dan menyandikan ulang** dengan GD menjadi JPEG maks. 1280 px.
3. Berkas disimpan sebagai `uploads/photos/<32 heks>.jpg`.
4. Basis data menyimpan **jalurnya saja**.

Penyandian ulang membuang seluruh metadata, termasuk koordinat GPS pada EXIF,
dan membuat berkas yang hanya *tampak* gambar gagal diproses.

### Saat menampilkan

`safePhotoSrc()` di `app.js` hanya meloloskan:

- data URI gambar (untuk pratinjau sebelum disimpan dan ilustrasi kategori), atau
- jalur berpola `uploads/photos/<32 heks>.jpg`, yang diberi awalan `../` karena
  halaman aplikasi berada di `/app/`.

Nilai lain menjadi string kosong. Ini mencegah nilai apa pun keluar dari
atribut `src`.

### Aset tanpa foto

Memakai ilustrasi kategori yang dibuat di peramban: SVG dengan warna mengikuti
kategori (`CATEGORY_HUE`) plus variasi kecil dari ID aset, berisi ikon kategori
dan namanya. Dibangkitkan saat render, tidak disimpan.

### Mengganti dan menghapus

- Mengirim data URI baru → berkas lama dihapus setelah yang baru tersimpan.
- Mengirim `photo: null` → berkas dihapus, kolom dikosongkan.
- Mengirim kembali jalur yang sudah ada → tidak ada perubahan. Inilah yang
  membuat menyunting kolom lain tidak menghilangkan foto.
- Menghapus baris → berkas fotonya ikut dihapus.

Penghapusan berkas memeriksa `realpath` berada di dalam direktori unggahan
sebelum `unlink`.

---

## 5. Mengubah data contoh

Sumber data contoh ada di `db/seed-src/data.js` dan `db/seed-src/data-ext.js`
(berkas JavaScript asal purwarupa). Alurnya:

```bash
# 1. Sunting db/seed-src/data-ext.js (jangan data.js yang besar)
# 2. Ekspor ulang ke JSON
node db/export-seed.js
# 3. Isi ulang basis data (MENGOSONGKAN tabel lebih dahulu)
php db/seed.php --force
```

> `php db/seed.php --force` **mengosongkan seluruh tabel data**. Jangan
> menjalankannya di server setelah ada data sungguhan. Tanpa `--force`, seeder
> hanya mengisi tabel yang masih kosong.

Berkas di `db/seed-src/` **tidak disajikan web server** (`.htaccess` menolak
seluruh `/db/`). Dahulu berkas-berkas itu berada di `assets/js/` dan dapat
diunduh siapa saja — memintas seluruh pemeriksaan hak akses. Lihat
[SECURITY.md K-07](../SECURITY.md#4-kelemahan-yang-diketahui).

---

## 6. Menambah dataset baru

1. Tambahkan tabelnya ke `db/schema.sql` — **backtick semua identifier**.
2. Jalankan `php db/migrate.php` (aman diulang; memverifikasi hasilnya).
3. Daftarkan di `DATASETS()` pada `api/lib/datasets.php`: tabel, kunci utama,
   modul RBAC, pola ID, dan kolom milik server.
4. Bila ada nilai turunan, tambahkan cabangnya di `applyDerived()` pada
   `api/lib/records.php`.
5. Tambahkan data contohnya ke `db/seed-src/data-ext.js`, lalu
   `node db/export-seed.js`.
6. Daftarkan urutan pengisiannya pada `$order` di `db/seed.php`.

Rincian beserta contoh kode: [PENGEMBANGAN.md](PENGEMBANGAN.md).
