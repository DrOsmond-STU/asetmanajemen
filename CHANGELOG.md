# Riwayat Perubahan

Seluruh perubahan penting pada SIMASET BMN. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/id/1.1.0/); penomoran mengikuti
[Semantic Versioning](https://semver.org/lang/id/).

---

## [2.2.0] — 2026-10-03

### Ditambahkan
- Set dokumentasi `.md` lengkap: [SECURITY.md](SECURITY.md),
  [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md), [docs/MODUL.md](docs/MODUL.md),
  [docs/HAK-AKSES.md](docs/HAK-AKSES.md), [docs/DATA.md](docs/DATA.md),
  [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md),
  [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md), [docs/DEPLOY.md](docs/DEPLOY.md),
  dan indeks [docs/README.md](docs/README.md).
- README ditulis ulang menyesuaikan kondisi aplikasi saat ini.

### Keamanan
- **`safePhotoSrc()`** — daftar-izin data URI gambar pada seluruh titik
  penyisipan foto (detail aset, bukti Work Order/Inspeksi, thumbnail daftar,
  linimasa riwayat, pratinjau formulir). Mencegah nilai `localStorage` yang
  disunting keluar dari atribut `src` dan menjalankan skrip. Diuji dengan
  payload `…base64,x" onerror="…`, `javascript:`, dan `data:text/html` —
  seluruhnya ditolak dan jatuh kembali ke ilustrasi kategori.
- Kelemahan yang diketahui didokumentasikan terbuka beserta daftar pengerasan
  wajib sebelum produksi.

---

## [2.1.0] — 2026-09-17

### Ditambahkan
- **Foto aset pada master (BMN Register)**: kolom thumbnail pada daftar, blok
  foto pada detail dengan unggah/ganti/hapus, dan lampiran foto pada formulir
  Tambah Aset.
- **Foto pada pencatatan Maintenance & Work Order** dan **Inspection &
  Condition**, langsung dari kamera perangkat pada ponsel.
- Ilustrasi kategori berwarna untuk aset yang belum difoto, dengan warna
  mengikuti kategori aset.
- Foto tampil pada linimasa riwayat aset.

### Teknis
- Kompresi gambar di `<canvas>` (maks 1024 px, JPEG 0,72) sebelum disimpan —
  sekaligus membuang metadata EXIF.
- Foto aset master disimpan pada kunci `localStorage` terpisah.
- Dukungan kolom tabel bertipe HTML, dikecualikan dari ekspor CSV.
- Penanganan kegagalan kuota penyimpanan dengan pemberitahuan ke pengguna.

---

## [2.0.0] — 2026-09-13

### Ditambahkan
- **Kontrol akses berbasis peran (RBAC)**: matriks 10 peran × 27 modul dengan
  tingkat `R`/`RW`/`A` pada `assets/js/rbac.js`; penyaringan menu, *guard*
  rute terhadap akses lewat alamat langsung, dan penyembunyian kontrol ubah
  untuk peran baca-saja.
- Modul **IoT & Telemetry**: 10 perangkat sensor, grafik telemetry berjalan
  dengan ambang batas, alarm yang dapat ditindaklanjuti menjadi Work Order.
- Modul **Integrasi Sistem**: status 7 titik integrasi dan riwayat
  sinkronisasi.
- Modul **Persetujuan Saya**: antrean approval berdasarkan matriks kewenangan.
- Modul **Hak Akses & Peran**: matriks peran × modul dan ekspor CSV.
- Modul **Manajemen Pengguna**: 15 pengguna dengan cakupan modul yang dihitung
  dari matriks RBAC.
- Dokumen daftar pengguna dan hak akses dalam format Word dan PDF.

---

## [1.2.0] — 2026-09-01

### Diubah
- Logo aplikasi diganti menjadi logo LPKMI pada halaman masuk dan aplikasi.
- Branding organisasi diseragamkan menjadi Lembaga Pusat Kajian Manajemen
  Indonesia.

---

## [1.1.0] — 2026-08-29

### Ditambahkan
- Kemampuan **Tambah Data** pada 19 modul dengan validasi dan penyimpanan
  `localStorage`.
- **QR code dan barcode Code128 sungguhan** beserta tampilan label siap cetak.
- **Pratinjau laporan** dengan tata letak sungguhnya dan ekspor cetak/PDF.
- Ekspor CSV pada modul tabel.

---

## [1.0.0] — 2026-08-29

### Ditambahkan
- Purwarupa awal: 21 modul, dataset simulasi, navigasi, dan design system.
