# Panduan Pengguna

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

Panduan pemakaian aplikasi di https://simaset.semestateknologiutama.com
(atau `http://localhost:8080` bila dijalankan lokal).

> Seluruh data pada aplikasi ini adalah **data simulasi**. Jangan memasukkan
> data BMN sungguhan atau foto aset sensitif — lihat [SECURITY.md](../SECURITY.md).

---

## 1. Masuk ke aplikasi

1. Buka alamat aplikasi.
2. Isi email dan kata sandi, atau buka **"Gunakan akun demo"** lalu klik salah
   satu kartu peran untuk mengisinya otomatis.
3. Kata sandi seluruh akun demo: **`simaset123`**.

Setiap kartu akun demo menampilkan jumlah modul yang akan tampil untuk peran
itu, sehingga Anda tahu yang diharapkan sebelum masuk.

**Keluar:** klik nama pengguna di pojok kanan atas, lalu konfirmasi.

---

## 2. Memahami menu Anda

Menu sidebar **hanya menampilkan modul yang menjadi kewenangan peran Anda**.
Penanda kecil di sisi kanan item menu:

| Penanda | Arti |
|---|---|
| `R` | Hanya dapat melihat — tidak ada tombol tambah/ubah |
| `A` | Dapat menyetujui transaksi pada modul itu |
| tanpa penanda | Dapat menambah dan mengubah data (`RW`) |

Membuka modul di luar kewenangan — termasuk dengan mengetik alamatnya — akan
menampilkan halaman **Akses Ditolak**.

Untuk melihat seluruh kewenangan Anda: menu **Hak Akses & Peran**.

---

## 3. Alur kerja utama

### 3.1 Mendaftarkan aset baru (BMN Officer, Asset Manager, Super Admin)

1. Buka **BMN Register** → **Tambah Baru**.
2. Isi nama, kategori, lokasi dan kondisi (kolom bertanda `*` wajib).
3. Pada **Foto Aset**, klik *Ambil / Unggah Foto* — di ponsel tombol ini
   langsung membuka kamera.
4. **Simpan**. Asset ID, BMN UID dan Tag ID dibuat otomatis mengikuti pola
   penomoran yang ada.

Aset yang belum difoto tetap memiliki penanda visual berupa ilustrasi
kategori berwarna.

### 3.2 Mencetak label QR/Barcode (BMN Officer)

1. Buka **QR/Barcode & Asset Tag** → klik satu baris.
2. Laci detail menampilkan QR code dan barcode Code128 **sungguhan** yang
   dapat dipindai.
3. Klik **Cetak Label** untuk membuka tampilan label siap cetak, lalu gunakan
   dialog cetak peramban (bisa juga disimpan sebagai PDF).

### 3.3 Mencatat Work Order dengan foto (Maintenance)

1. Buka **Maintenance & Work Order** → **Tambah Baru**.
2. Pilih aset, tipe (Preventive/Corrective), prioritas, teknisi, dan
   deskripsi masalah.
3. Lampirkan **Foto Aset / Bukti Pekerjaan**.
4. **Simpan**. Foto akan tampil pada detail work order dan pada linimasa
   riwayat aset terkait.

### 3.4 Mencatat inspeksi kondisi (Inspector)

1. Buka **Inspection & Condition** → **Tambah Baru**.
2. Isi enam parameter skor 1–5: kondisi fisik, performa, reliabilitas,
   keselamatan, maintenance, dokumentasi.
3. Tulis temuan dan pilih rekomendasi.
4. Lampirkan **Foto Kondisi Aset**, lalu simpan.

### 3.5 Menindaklanjuti alarm IoT (Maintenance, Asset Manager, Cyber Officer)

1. Buka **IoT & Telemetry**. Panel kiri menampilkan grafik telemetry berjalan
   dengan garis ambang batas; panel kanan menampilkan alarm aktif.
2. Pada alarm berstatus *Terbuka*, klik **Buat WO**.
3. Formulir Work Order terbuka dengan deskripsi masalah dan prioritas yang
   **sudah terisi otomatis** dari data alarm. Lengkapi lalu simpan.

### 3.6 Menyetujui transaksi (Asset Manager, Cyber Officer, Management)

1. Buka **Persetujuan Saya**.
2. Tabel atas berisi antrean yang menjadi kewenangan peran Anda; tabel bawah
   adalah antrean peran lain (hanya dapat dilihat).
3. Klik **Setujui** atau **Tolak**. Keputusan beserta nama dan tanggal
   tersimpan dan langsung tampil pada baris tersebut.

### 3.7 Sensus lapangan (Inspector, BMN Officer)

1. Buka **Sensus & Inventarisasi** → **Buat Rencana Sensus** untuk area dan
   petugas tertentu.
2. Klik sebuah rencana untuk melihat kemajuan pemindaian dan **antrean
   anomali** (Not Found, Moved, Duplicate, Damaged, dan lainnya) beserta
   tindak lanjut yang disarankan.

### 3.8 Membuka dan mencetak laporan (semua peran)

1. Buka **Reporting & Executive Dashboard** → klik satu baris laporan.
2. Pratinjau menampilkan tata letak laporan sungguhnya: kop, KPI, dan tabel.
3. Gunakan tombol cetak untuk mencetak atau menyimpan sebagai PDF.

### 3.9 Mengelola pengguna (Super Admin)

1. Buka **Manajemen Pengguna**.
2. Klik satu baris untuk melihat rincian kewenangan peran pengguna tersebut —
   modul mana yang dapat disetujui, diubah, atau hanya dilihat.
3. **Tambah Baru** untuk mendaftarkan pengguna; hak aksesnya otomatis
   mengikuti peran yang dipilih.

---

## 4. Fitur yang tersedia di semua modul tabel

| Fitur | Cara pakai |
|---|---|
| Pencarian | Kotak cari di atas tabel, mencari pada kolom-kolom kunci modul |
| Filter | Dropdown di samping kotak cari (mis. kategori, status, criticality) |
| Detail | Klik baris mana pun untuk membuka laci detail |
| Ekspor CSV | Tombol **Ekspor CSV** — mengekspor hasil yang sedang tersaring |
| Pencarian global | Kotak cari di bar atas, melompat ke BMN Register dengan kata kunci terisi |

---

## 5. Pertanyaan umum

**Data yang saya tambahkan hilang setelah ganti peramban/perangkat.**
Benar. Purwarupa menyimpan data di `localStorage` peramban masing-masing,
bukan di server. Data tidak tersinkronisasi antar perangkat.

**Menu saya lebih sedikit dari rekan saya.**
Itu memang perilaku yang diharapkan — menu mengikuti peran. Buka **Hak Akses
& Peran** untuk melihat perbandingannya.

**Foto gagal disimpan.**
Kemungkinan kuota penyimpanan peramban penuh. Hapus sebagian foto, atau
bersihkan data lokal ([SECURITY.md §6](../SECURITY.md#6-pembersihan-data-pada-perangkat-bersama)).

**Bagaimana mengembalikan aplikasi ke kondisi awal?**
Hapus seluruh kunci `simaset_*` pada penyimpanan peramban, lalu muat ulang.
Dataset bawaan tidak pernah berubah, sehingga aplikasi kembali seperti semula.

**Tombol kamera tidak membuka kamera di laptop.**
Pada desktop, tombol membuka pemilih berkas — perilaku normal. Atribut kamera
hanya berpengaruh di perangkat bergerak.
