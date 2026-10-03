# Dokumentasi SIMASET BMN

[← Kembali ke README utama](../README.md)

## Dokumen teknis

| Dokumen | Untuk siapa | Isi |
|---|---|---|
| **[SECURITY.md](../SECURITY.md)** | Semua pihak, wajib sebelum demo | Model keamanan, kelemahan yang diketahui, pengerasan wajib sebelum produksi, pembersihan data |
| [ARSITEKTUR.md](ARSITEKTUR.md) | Pengembang, arsitek | Struktur aplikasi, urutan muat berkas, alur render, keputusan teknis |
| [MODUL.md](MODUL.md) | Semua | Katalog 27 modul beserta fungsinya |
| [HAK-AKSES.md](HAK-AKSES.md) | Pemilik proses, auditor | Definisi 10 peran, matriks kewenangan, cara penegakan, cara mengubah |
| [DATA.md](DATA.md) | Pengembang, analis | Dataset, relasi entitas, penyimpanan peramban, penanganan foto |
| [PANDUAN-PENGGUNA.md](PANDUAN-PENGGUNA.md) | Pengguna aplikasi | Cara masuk, memahami menu, dan sembilan alur kerja utama |
| [PENGEMBANGAN.md](PENGEMBANGAN.md) | Pengembang | Menambah modul/formulir/peran, konvensi kode, pengujian |
| [DEPLOY.md](DEPLOY.md) | Pengelola sistem | Penempatan, verifikasi, pemeriksaan keamanan pasca-deploy, rollback |
| [CHANGELOG.md](../CHANGELOG.md) | Semua | Riwayat perubahan antar versi |

## Berkas paparan dan laporan

| Berkas | Isi |
|---|---|
| `SIMASET-BMN-Daftar-Pengguna.docx` / `.pdf` | Daftar 15 pengguna, definisi 10 peran, dan matriks 27 modul × 10 peran. Dibangkitkan langsung dari `rbac.js` dan `data-ext.js` |
| `SIMASET-BMN-Presentasi.pptx` | Paparan korporat 50 slide: konteks, regulasi, output, manfaat, risiko tanpa digitalisasi, 21 modul, keterkaitan ISO 55000/55001, BMN, ISO/IEC 27001 |
| `SIMASET-BMN-Materi-Seminar.pptx` | Materi seminar 2 hari (28 slide) dengan 9 flow chart alur kerja dan tangkapan layar aplikasi |
| `SIMASET-BMN-Dokumentasi-Fitur-Purwarupa.docx` | Dokumentasi fitur beserta tangkapan layar |

> Dokumen daftar pengguna dibangkitkan dari kode. Bila matriks hak akses atau
> daftar pengguna berubah, bangkitkan ulang — lihat [DEPLOY.md §6](DEPLOY.md#6-membangkitkan-ulang-dokumen-pendamping).

## Mulai dari mana

| Kebutuhan | Baca ini |
|---|---|
| Mendemokan aplikasi | [SECURITY.md](../SECURITY.md) lalu [PANDUAN-PENGGUNA.md](PANDUAN-PENGGUNA.md) |
| Memahami kewenangan peran | [HAK-AKSES.md](HAK-AKSES.md) |
| Menambah fitur | [ARSITEKTUR.md](ARSITEKTUR.md) lalu [PENGEMBANGAN.md](PENGEMBANGAN.md) |
| Menilai kesiapan produksi | [SECURITY.md §4 dan §5](../SECURITY.md#4-kelemahan-yang-diketahui-diterima-pada-tahap-purwarupa) |
| Menempatkan ke server | [DEPLOY.md](DEPLOY.md) |
