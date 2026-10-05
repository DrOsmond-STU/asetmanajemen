# Dokumentasi SIMASET BMN

[← Kembali ke README utama](../README.md)

---

## Dokumen teknis

| Dokumen | Isi |
|---|---|
| [ARSITEKTUR.md](ARSITEKTUR.md) | Arsitektur front-end + backend, urutan muat, alur satu permintaan, keputusan teknis beserta alasannya |
| [API.md](API.md) | Seluruh endpoint, bentuk permintaan/jawaban, kode galat, dan apa saja yang ditentukan server |
| [MODUL.md](MODUL.md) | Katalog 27 modul beserta fungsi dan rutenya |
| [HAK-AKSES.md](HAK-AKSES.md) | 10 peran, matriks 27 × 10, dan cara penegakannya di server maupun di peramban |
| [DATA.md](DATA.md) | Skema 40 tabel, registry dataset, pola ID, penanganan foto |
| [PENGEMBANGAN.md](PENGEMBANGAN.md) | Menyiapkan lingkungan, menambah modul/formulir/dataset, konvensi, pengujian |
| [DEPLOY.md](DEPLOY.md) | Kebutuhan server, penyiapan basis data, alur deploy, verifikasi, rollback, pencadangan |
| [PANDUAN-PENGGUNA.md](PANDUAN-PENGGUNA.md) | Panduan pemakaian: alur kerja utama per peran dan pertanyaan umum |
| [../SECURITY.md](../SECURITY.md) | Model keamanan, kontrol yang ada, kelemahan yang diketahui, pengerasan sebelum data sungguhan |
| [../CHANGELOG.md](../CHANGELOG.md) | Riwayat perubahan |

## Berkas paparan dan laporan

| Berkas | Isi |
|---|---|
| `SIMASET-BMN-Presentasi.pptx` | Paparan korporat 50 slide: konteks, regulasi, output, manfaat, risiko tanpa digitalisasi, 21 modul, keterkaitan ISO 55000/55001, BMN, ISO/IEC 27001 |
| `SIMASET-BMN-Materi-Seminar.pptx` | Materi seminar 28 slide mengikuti rundown dua hari, dengan tangkapan layar dan 9 diagram alur |
| `SIMASET-BMN-Daftar-Pengguna.docx` / `.pdf` | Daftar 15 pengguna, definisi 10 peran, dan matriks 27 modul × 10 peran. Dibangkitkan langsung dari `rbac.js` dan data pengguna |
| `SIMASET-BMN-Dokumentasi-Fitur-Purwarupa.docx` | Dokumentasi fitur beserta tangkapan layar |

> Berkas paparan dibuat ketika aplikasi masih berjumlah 21 modul dan belum
> memiliki backend. Isinya belum diperbarui ke keadaan v3.0.0.

## Mulai dari mana

| Kebutuhan | Baca |
|---|---|
| Memakai aplikasinya | [PANDUAN-PENGGUNA.md](PANDUAN-PENGGUNA.md) |
| Memahami rancangannya | [ARSITEKTUR.md](ARSITEKTUR.md) lalu [DATA.md](DATA.md) |
| Menyambungkan sistem lain | [API.md](API.md) |
| Menambahkan fitur | [PENGEMBANGAN.md](PENGEMBANGAN.md) |
| Memasang di server | [DEPLOY.md](DEPLOY.md) |
| Memahami kewenangan peran | [HAK-AKSES.md](HAK-AKSES.md) |
| Menilai kesiapan produksi | [SECURITY.md §4](../SECURITY.md#4-kelemahan-yang-diketahui) dan [§5](../SECURITY.md#5-pengerasan-sebelum-dipakai-dengan-data-sungguhan) |
