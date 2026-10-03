# Model Data & Penyimpanan

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

## 1. Dua lapis data

| Lapis | Berkas / kunci | Sifat |
|---|---|---|
| **Dataset bawaan** | `assets/js/data.js`, `assets/js/data-ext.js` | Statis, ikut repositori, tidak pernah ditulisi aplikasi |
| **Data pengguna** | `localStorage` | Ditambahkan lewat aplikasi, bertahan per perangkat/peramban |

Saat aplikasi dimuat, `loadUserRecords()` menggabungkan catatan `localStorage`
ke dalam array dataset di memori. Dataset bawaan tetap utuh, sehingga
menghapus `localStorage` selalu mengembalikan aplikasi ke kondisi awal.

---

## 2. Dataset bawaan

### `assets/js/data.js` — dataset inti

| Dataset | Jml | Isi |
|---|--:|---|
| `assets` | 62 | Register aset: identitas BMN, lokasi, custodian, kondisi, criticality, status |
| `asset_tags` | 62 | Tag QR/barcode per aset: payload, material, batch cetak |
| `locations` | 42 | Titik lokasi: gedung, lantai, ruang/lab |
| `buildings` | 7 | Gedung |
| `categories` | 6 | Kategori aset |
| `units` | 11 | Unit kerja |
| `custodians` | 16 | Pemegang tanggung jawab aset |
| `work_orders` | 28 | Work order preventif/korektif |
| `inspections` | 20 | Hasil inspeksi dengan enam parameter skor |
| `risks` | 18 | Risk register per aset |
| `asset_kpis` | 30 | Availability, MTBF, MTTR, utilization, AHI, rekomendasi |
| `costs` | 70 | Biaya siklus hidup |
| `sensus_plans` | 6 | Rencana sensus per area |
| `sensus_items` | 284 | Hasil pemindaian sensus beserta anomali |
| `mutasi` | 14 | Permintaan mutasi/IMACD |
| `jml_events` | 12 | Peristiwa Joiner–Mover–Leaver |
| `recon_batches` / `recon_items` | 3 / 60 | Batch rekonsiliasi SAKTI/SIMAN dan itemnya |
| `disposals` | 9 | Usulan penghapusan |
| `cyber_assets` | 4 | Aset siber/kripto sensitif |
| `access_logs` | 24 | Log akses aset sensitif |
| `sanitizations` | 9 | Sanitisasi media (NIST SP 800-88 Rev.2) |
| `audits` | 8 | Temuan audit |
| `documents` | 25 | Register dokumen aset |
| `reports` | 8 | Definisi laporan |
| `governance` | objek | Kebijakan, sasaran/KPI, SAMP, management review, improvement |
| `demo_users` | 10 | Akun yang dapat dipakai masuk |

### `assets/js/data-ext.js` — dataset tambahan

| Dataset | Jml | Isi |
|---|--:|---|
| `users` | 15 | Pengguna aplikasi: peran, NIP, unit, status, MFA, login terakhir |
| `iot_devices` | 10 | Perangkat sensor: protokol, metrik, ambang batas, baterai, status |
| `iot_alerts` | 6 | Alarm telemetry beserta severity dan tindak lanjut |
| `integrations` | 7 | Titik integrasi sistem eksternal dan kesehatannya |
| `sync_logs` | 7 | Riwayat sinkronisasi, termasuk kasus gagal |
| `approvals` | 8 | Antrean persetujuan beserta peran yang berwenang |

> `data-ext.js` menambahkan isinya ke `SIMASET_DATA` lewat `Object.assign`,
> sehingga harus dimuat **setelah** `data.js`.

---

## 3. Relasi antar entitas

```
assets (asset_id) ─┬─ asset_tags.asset_id          tag QR/barcode
                   ├─ work_orders.asset_id         pemeliharaan (+ photo)
                   ├─ inspections.asset_id         kondisi      (+ photo)
                   ├─ risks.asset_id               risiko
                   ├─ asset_kpis.asset_id          kinerja & AHI
                   ├─ costs.asset_id               biaya siklus hidup
                   ├─ documents.asset_id           dokumen
                   ├─ cyber_assets.asset_id        klasifikasi sensitif
                   ├─ iot_devices.asset_id         telemetry
                   ├─ mutasi.asset_id              perpindahan
                   ├─ disposals.asset_id           penghapusan
                   └─ simaset_asset_photos_v1[id]  foto master (localStorage)

locations (location_id) ── assets.location_id
custodians (name)       ── assets.custodian_name
iot_devices (device_id) ── iot_alerts.device_id
approvals.modul         ── id modul; menentukan peran yang berwenang (RBAC)
```

Identitas aset memakai **dua sistem** yang dipetakan satu sama lain:

| Identitas | Contoh | Peran |
|---|---|---|
| `asset_id` | `AST-2026-000001` | Kunci utama internal |
| `bmn_uid` | `677321-3.5.7.06-000001` | Gabungan Kode Satker + Kode Barang + NUP |
| `tag_id` | `TAG-000001` | Identitas fisik pada label QR/barcode |

---

## 4. Penyimpanan peramban

| Kunci | Jenis | Isi | Umur |
|---|---|---|---|
| `simaset_user` | sessionStorage | Pengguna yang sedang masuk | Hilang saat tab ditutup |
| `simaset_user_records_v1` | localStorage | Catatan baru per dataset: `{ "work_orders": [...], "inspections": [...] }` | Permanen sampai dihapus |
| `simaset_asset_photos_v1` | localStorage | Foto aset master: `{ "AST-2026-000001": "data:image/jpeg;base64,…" }` | Permanen sampai dihapus |
| `simaset_approvals_v1` | localStorage | Keputusan persetujuan: `{ "APV-2026-041": { status, by, role, at } }` | Permanen sampai dihapus |

Cara membersihkan: [SECURITY.md §6](../SECURITY.md#6-pembersihan-data-pada-perangkat-bersama).

### Penanganan foto

- Dikompres di `<canvas>` ke maksimum 1024 px, JPEG kualitas 0,72 — metadata
  EXIF (termasuk GPS) ikut terbuang dalam proses ini.
- Foto **aset master** disimpan pada kunci terpisah agar catatan transaksi
  tetap ringkas; foto **Work Order/Inspeksi** menyatu dalam catatannya.
- Setiap pembacaan melewati `safePhotoSrc()` yang hanya menerima data URI
  gambar — lihat [SECURITY.md §3.3](../SECURITY.md#33-daftar-izin-data-uri-untuk-foto).
- Kuota `localStorage` (±5 MB) membatasi jumlah foto; kegagalan kuota
  dibatalkan dan diberitahukan, tidak hilang diam-diam.

---

## 5. Pembuatan ID baru

`nextId(rows, idKey)` membaca pola ID terakhir pada dataset lalu menaikkan
angkanya dengan lebar digit yang sama:

```
AST-2026-000062  →  AST-2026-000063
WO-2026-0028     →  WO-2026-0029
USR-015          →  USR-016
```

---

## 6. Menambah dataset

1. Tambahkan array ke `data-ext.js` (jangan menyunting `data.js` yang besar).
2. Daftarkan modul yang memakainya di `modules.js` dengan `dataset:'nama'` dan
   `idKey:'kolom_id'`.
3. Tambahkan label kolom yang ramah ke `FIELD_LABELS` pada `modules.js`.
4. Bila dapat ditambah lewat formulir, buat `FORM_CONFIGS` di `app.js` —
   lihat [PENGEMBANGAN.md](PENGEMBANGAN.md).
