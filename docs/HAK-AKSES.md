# Hak Akses & Peran

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

Dokumen ini adalah **spesifikasi kewenangan** SIMASET BMN. Sumber tunggalnya
adalah [`assets/js/rbac.js`](../assets/js/rbac.js); tabel di bawah dibangkitkan
dari berkas tersebut sehingga selalu sama dengan yang berjalan di aplikasi.

> ℹ️ Sejak v3.0.0 aturan ini **ditegakkan di server** pada setiap permintaan
> API, bukan lagi hanya di peramban. Pemeriksaan di peramban tetap ada untuk
> mengatur tampilan. Lihat [§5](#5-cara-aturan-ini-ditegakkan) dan
> [SECURITY.md](../SECURITY.md).

---

## 1. Tingkat kewenangan

| Tingkat | Arti | Yang bisa dilakukan |
|---|---|---|
| `R` | Lihat | Membuka modul, mencari, memfilter, membuka detail, ekspor CSV |
| `RW` | Lihat + Ubah | Seluruh `R`, ditambah menambah/mengubah data (tombol *Tambah Baru*, unggah foto) |
| `A` | Lihat + Ubah + Setujui | Seluruh `RW`, ditambah menyetujui/menolak transaksi pada modul tersebut |
| – | Tidak ada akses | Modul tidak tampil di menu dan tidak dapat dibuka lewat alamat langsung |

Prinsipnya **deny-by-default**: modul yang tidak tercantum pada peta sebuah
peran otomatis tertutup.

---

## 2. Definisi peran

| Peran | Singkatan | Cakupan kewenangan | Modul | Ubah | Setujui |
|---|---|---|--:|--:|--:|
| **Super Admin** | Admin | Konfigurasi teknis sistem, master data dan integrasi. Tidak otomatis berwenang menyetujui transaksi operasional. | 27 | 24 | 0 |
| **Asset Manager** | Asset | Pemilik proses siklus hidup aset: kondisi, risiko, kinerja dan keputusan lifecycle. Menyetujui sensus, mutasi, maintenance, rekonsiliasi dan sanitisasi. | 26 | 16 | 7 |
| **BMN Officer** | BMN | Penatausahaan BMN: register, tagging QR/barcode, sensus, mutasi dan rekonsiliasi SAKTI/SIMAN. | 25 | 9 | 0 |
| **Finance** | Finance | Biaya dan nilai aset sesuai kewenangan: lifecycle cost, TCO, dan referensi nilai perolehan. | 11 | 1 | 0 |
| **Maintenance** | Maint | Pemeliharaan preventif/korektif, work order, dan tindak lanjut alarm telemetry IoT. | 11 | 2 | 0 |
| **Inspector** | Inspect | Inspeksi dan penilaian kondisi aset, serta pelaksanaan sensus lapangan. | 11 | 2 | 0 |
| **Custodian** | Cust | Aset yang menjadi tanggung jawabnya: acknowledgement, permintaan mutasi, dan pengembalian aset. | 10 | 2 | 0 |
| **Cyber Officer** | Cyber | Aset siber/kripto sensitif, sanitisasi media, dan otorisasi keamanan pada proses disposal. | 14 | 6 | 2 |
| **Auditor** | Audit | Akses baca pada seluruh modul untuk keperluan pemeriksaan dan pengumpulan evidence. Tidak dapat mengubah data. | 27 | 0 | 0 |
| **Management** | Mgmt | Dashboard eksekutif, laporan, dan persetujuan pada risiko, rekonsiliasi, sanitisasi dan disposal. | 16 | 5 | 5 |
> Kolom **Modul** = jumlah modul yang dapat dibuka · **Ubah** = modul dengan
> tingkat `RW` atau `A` · **Setujui** = modul dengan tingkat `A`.

---

## 3. Akun demo

Seluruh akun demo memakai kata sandi **`simaset123`** (bersifat publik —
lihat [SECURITY.md](../SECURITY.md)).

| Peran | Email akun demo | Nama | Unit kerja |
|---|---|---|---|
| Super Admin | `admin@simaset.go.id` | Sari Anggraini | Unit TIK |
| Asset Manager | `asset.manager@simaset.go.id` | Lestari Kusuma | Bagian Umum & BMN |
| BMN Officer | `bmn.officer@simaset.go.id` | Fajar Nugroho | Bagian Umum & BMN |
| Finance | `finance@simaset.go.id` | Yusuf Pratama | Bagian Keuangan |
| Maintenance | `maintenance@simaset.go.id` | Joko Saputra | Unit Sarana & Prasarana |
| Inspector | `inspector@simaset.go.id` | Muhammad Wijaya | Unit Sarana & Prasarana |
| Custodian | `custodian@simaset.go.id` | Fajar Yulianto | Unit Laboratorium |
| Cyber Officer | `cyber.officer@simaset.go.id` | Zainal Utomo | Unit Keamanan Informasi |
| Auditor | `auditor@simaset.go.id` | Cahyo Hidayat | Satuan Pengawas Internal |
| Management | `management@simaset.go.id` | Umar Hidayat | Pimpinan |
Lima pengguna lain (`USR-011`–`USR-015`) terdaftar pada modul Manajemen
Pengguna sebagai pengguna operasional, namun **tidak dapat dipakai masuk**.

---

## 4. Matriks peran × modul

| Modul | Admin | Asset | BMN | Finance | Maint | Inspect | Cust | Cyber | Audit | Mgmt |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard Eksekutif | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` |
| Master Data | `RW` | `R` | `R` | – | – | – | – | – | `R` | – |
| BMN Register | `RW` | `RW` | `RW` | `R` | `R` | `R` | `R` | `R` | `R` | `R` |
| Asset Lifecycle | `RW` | `RW` | `R` | `R` | – | – | – | – | `R` | – |
| QR/Barcode & Asset Tag | `RW` | `R` | `RW` | – | `R` | `R` | `R` | – | `R` | – |
| Sensus & Inventarisasi | `RW` | `A` | `RW` | – | – | `RW` | – | – | `R` | – |
| Mutasi / IMACD | `RW` | `A` | `RW` | – | – | – | `RW` | – | `R` | – |
| Custodian Management | `RW` | `RW` | `RW` | – | – | – | `R` | – | `R` | – |
| JML Lifecycle | `RW` | `R` | `RW` | – | – | – | `RW` | – | `R` | – |
| Maintenance & Work Order | `RW` | `A` | `R` | – | `RW` | `R` | `R` | – | `R` | – |
| Inspection & Condition | `RW` | `R` | `R` | – | `R` | `RW` | – | – | `R` | – |
| IoT & Telemetry | `RW` | `RW` | – | – | `RW` | `R` | – | `RW` | `R` | `R` |
| Risk & Criticality | `RW` | `RW` | `R` | – | `R` | – | – | `RW` | `R` | `A` |
| Performance & Asset Health | `RW` | `RW` | `R` | `R` | `R` | `R` | – | – | `R` | `R` |
| Financial & Lifecycle Cost | `RW` | `R` | `R` | `RW` | – | – | – | – | `R` | `R` |
| SAKTI/SIMAN Reconciliation | `RW` | `A` | `RW` | `R` | – | – | – | – | `R` | `A` |
| BMN Disposal | `RW` | `RW` | `RW` | `R` | – | – | – | `A` | `R` | `A` |
| Cyber Asset Management | `RW` | `A` | `R` | – | – | – | – | `RW` | `R` | – |
| Media Sanitization | `RW` | `A` | `R` | – | – | – | – | `RW` | `R` | `A` |
| ISO 55000/55001 Governance | `RW` | `RW` | `R` | – | – | – | – | `R` | `R` | `R` |
| Audit & Compliance | `RW` | `R` | `R` | `R` | – | – | – | `R` | `R` | `R` |
| Document Management | `RW` | `RW` | `RW` | `R` | `R` | `R` | `R` | `R` | `R` | – |
| Reporting & Executive Dashboard | `RW` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` |
| Integrasi Sistem | `RW` | `R` | `R` | – | – | – | – | `R` | `R` | `R` |
| Persetujuan Saya | `R` | `A` | `R` | – | – | – | – | `A` | `R` | `A` |
| Hak Akses & Peran | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` | `R` |
| Manajemen Pengguna | `RW` | – | – | – | – | – | – | – | `R` | `R` |
Singkatan kolom: Admin = Super Admin · Asset = Asset Manager · BMN = BMN
Officer · Maint = Maintenance · Inspect = Inspector · Cust = Custodian ·
Cyber = Cyber Officer · Audit = Auditor · Mgmt = Management.

---

## 5. Cara aturan ini ditegakkan

Penegakan terjadi di **dua lapisan**, dan hanya satu di antaranya yang menjadi
batas keamanan.

### 5.1 Lapisan server — inilah batas keamanan

Setiap permintaan API diperiksa sebelum data disentuh:

| Jalur | Pemeriksaan | Bila gagal |
|---|---|---|
| `GET /api/records/{dataset}` | `requireRead(modul)` | `403` |
| `POST` / `PUT` / `DELETE /api/records/…` | `requireWrite(modul)` | `403` |
| `POST /api/approvals/{id}/decide` | `requireApprove` pada modul `approval` **dan** modul yang diampu permintaan, lalu `role_required` harus cocok | `403` |
| `GET /api/bootstrap` | setiap dataset disaring; yang tidak boleh dibaca dikirim sebagai array kosong | — |

Prinsipnya **tolak secara bawaan**: `rbacLevel()` mengembalikan `'-'` untuk
peran atau modul yang tidak terdaftar, dan `'-'` berarti tidak ada akses.
Setiap penolakan dicatat ke `audit_log` dengan aksi `denied`.

Matriks yang dipakai server, [`api/lib/rbac-matrix.php`](../api/lib/rbac-matrix.php),
**dibangkitkan** dari `assets/js/rbac.js` oleh `node db/gen-rbac.js` — tidak
ditulis ulang dengan tangan, sehingga aturan di kedua sisi tidak mungkin
berbeda.

### 5.2 Lapisan peramban — hanya mengatur tampilan

Tiga titik pemeriksaan di [`assets/js/app.js`](../assets/js/app.js):

| Titik | Fungsi | Perilaku |
|---|---|---|
| Menu sidebar | `renderSidebar()` | Hanya merender item yang lolos `canRead()`; menambahkan penanda `R` atau `A` pada item |
| Router | `route()` | Memanggil `canRead(hash)` sebelum merender; bila gagal → halaman **Akses Ditolak**, termasuk saat alamat diketik manual |
| Kontrol aksi | `mountListPage()`, `attachRowActions()` dan renderer khusus | Tombol *Tambah Baru*, *Ubah* dan *Hapus* hanya dirender bila `canWrite()`; tombol setujui hanya bila `canApprove()`; peran baca-saja mendapat penanda *Akses Lihat Saja* |

Menghapus seluruh kode lapisan ini dari DevTools **tidak** memberi akses apa
pun. Uji otomatis membuktikannya: sebagai Auditor, memanggil
`API.create('assets', …)` langsung dari konsol peramban menghasilkan `403`.

### 5.3 API yang tersedia

Di peramban (`assets/js/rbac.js`):

```js
RBAC.level(peran, modul)        // 'R' | 'RW' | 'A' | '-'
RBAC.canRead(peran, modul)      // boolean
RBAC.canWrite(peran, modul)     // boolean — true untuk RW dan A
RBAC.canApprove(peran, modul)   // boolean — true hanya untuk A
RBAC.allowedModules(peran)      // array id modul
RBAC.countByLevel(peran)        // { R, RW, A, '-' }
RBAC.describe(peran)            // uraian cakupan kewenangan
```

Di dalam `app.js` tersedia pintasan yang sudah terikat ke peran pengguna
aktif: `canRead(modul)`, `canWrite(modul)`, `canApprove(modul)`.

Di server (`api/lib/rbac.php`):

```php
rbacLevel($peran, $modul)        // 'R' | 'RW' | 'A' | '-'
rbacCanRead($peran, $modul)      // bool
rbacCanWrite($peran, $modul)     // bool — true untuk RW dan A
rbacCanApprove($peran, $modul)   // bool — true hanya untuk A
rbacAllowedModules($peran)       // array id modul

requireRead($modul);             // menghentikan permintaan dengan 403
requireWrite($modul);
requireApprove($modul);
```

---

## 6. Mengubah kewenangan

1. Sunting objek `ROLE_ACCESS` pada `assets/js/rbac.js`.
2. Modul baru juga harus didaftarkan pada array `RBAC_MODULES` agar ikut
   terhitung dan tampil pada matriks.
3. **Bangkitkan ulang matriks server:**

   ```bash
   node db/gen-rbac.js     # assets/js/rbac.js -> api/lib/rbac-matrix.php
   ```

   Tanpa langkah ini server masih memakai aturan yang lama, dan antarmuka akan
   menampilkan menu yang permintaannya ditolak `403`.
4. Jalankan ulang uji peran — lihat [PENGEMBANGAN.md §Pengujian](PENGEMBANGAN.md#6-pengujian).
5. Bangkitkan ulang dokumen daftar pengguna bila perlu (lihat
   [DEPLOY.md](DEPLOY.md)).

Jangan menanam pemeriksaan peran ad-hoc di luar `rbac.js` — aturan yang
tersebar membuat audit kewenangan tidak dapat dipercaya.

---

## 7. Memverifikasi di aplikasi

Buka menu **Hak Akses & Peran** (`#/access`) — dapat diakses semua peran.
Halaman itu menampilkan matriks yang sama dengan dokumen ini, menandai kolom
peran yang sedang aktif, dan menyediakan ekspor matriks ke CSV.

Uji cepat: masuk sebagai `custodian@simaset.go.id` — harus tampil **10 menu**
tanpa Master Data, Risk, atau Cyber. Lalu ketik `#/master-data` pada alamat —
harus muncul halaman **Akses Ditolak**.

Uji bahwa batasnya nyata, bukan sekadar tampilan: buka konsol peramban dan
jalankan

```js
await API.list('cyber_assets')      // sebagai Custodian
```

Hasilnya harus `ApiError` dengan `status` `403`, bukan data.
