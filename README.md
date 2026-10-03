# SIMASET BMN

**Integrated Asset & BMN Lifecycle Management System** — purwarupa aplikasi
manajemen aset dan Barang Milik Negara yang selaras dengan prinsip
**ISO 55000/55001**, ketentuan pengelolaan BMN, dan praktik keamanan informasi
**ISO/IEC 27001**.

Dikembangkan oleh **Lembaga Pusat Kajian Manajemen Indonesia (LPKMI)**.

🔗 **Aplikasi berjalan:** https://simaset.semestateknologiutama.com

> ⚠️ **Purwarupa front-end tanpa server aplikasi.** Seluruh data bersifat
> simulasi dan seluruh pemeriksaan hak akses berjalan di peramban. Jangan
> memasukkan data BMN sungguhan atau foto aset sensitif. Baca
> **[SECURITY.md](SECURITY.md)** sebelum demo atau uji coba.

---

## Isi singkat

| | |
|---|---|
| **27 modul** | dalam 10 kelompok navigasi — register, operasional lapangan, pemeliharaan, risiko, kepatuhan BMN, keamanan siber, governance, pelaporan, integrasi |
| **10 peran pengguna** | dengan matriks kewenangan `R` / `RW` / `A` per modul |
| **15 pengguna** | 10 akun demo yang dapat dipakai masuk + 5 pengguna operasional |
| **62 aset contoh** | lengkap dengan tag QR/barcode, work order, inspeksi, risiko dan biaya |
| **0 dependensi runtime eksternal** | seluruh pustaka di-host sendiri |

## Menjalankan secara lokal

Aplikasi murni HTML/CSS/JS statis — cukup sajikan direktori ini lewat static
file server:

```bash
python3 -m http.server 8080
# atau
npx http-server -p 8080
```

Buka `http://localhost:8080/index.html`, lalu masuk dengan salah satu akun demo
(kata sandi seragam **`simaset123`**):

| Peran | Email | Menu tampil |
|---|---|---|
| Super Admin | `admin@simaset.go.id` | 27 |
| Asset Manager | `asset.manager@simaset.go.id` | 26 (7 dapat disetujui) |
| BMN Officer | `bmn.officer@simaset.go.id` | 25 |
| Finance | `finance@simaset.go.id` | 11 |
| Maintenance | `maintenance@simaset.go.id` | 11 |
| Inspector | `inspector@simaset.go.id` | 11 |
| Custodian | `custodian@simaset.go.id` | 10 |
| Cyber Officer | `cyber.officer@simaset.go.id` | 14 (2 dapat disetujui) |
| Auditor | `auditor@simaset.go.id` | 27 (semua lihat saja) |
| Management | `management@simaset.go.id` | 16 (5 dapat disetujui) |

Daftar lengkap: [docs/HAK-AKSES.md](docs/HAK-AKSES.md).

> Membuka berkas lewat `file://` tidak disarankan — beberapa fitur memerlukan
> konteks HTTP.

## Struktur proyek

```
index.html                      Halaman masuk
app/index.html                  Kerangka aplikasi (SPA) setelah masuk
assets/css/style.css            Design system: token, tata letak, komponen
assets/js/icons.js              Set ikon SVG inline
assets/js/data.js               Dataset simulasi inti (aset, WO, inspeksi, dll.)
assets/js/data-ext.js           Dataset tambahan (pengguna, IoT, integrasi, persetujuan)
assets/js/rbac.js               Matriks hak akses 10 peran × 27 modul
assets/js/modules.js            Registri modul: kolom, filter, KPI, label
assets/js/app.js                Router hash, rendering, formulir, RBAC, foto
assets/js/vendor/               Chart.js, qrcode-generator, JsBarcode (host sendiri)
assets/img/                     Logo LPKMI
docs/                           Dokumentasi + berkas paparan & laporan
```

## Fitur utama

- **Register BMN** dengan identitas ganda (Asset ID internal ↔ Kode Satker +
  Kode Barang + NUP), foto aset, dan detail bertab.
- **QR Code & Barcode sungguhan** (bukan gambar contoh) lengkap dengan tampilan
  label siap cetak.
- **Pencatatan lapangan**: sensus dengan antrean anomali, mutasi/IMACD,
  custodian, dan siklus Joiner–Mover–Leaver.
- **Pemeliharaan & inspeksi** dengan lampiran foto kondisi dari kamera perangkat.
- **IoT & Telemetry**: 10 perangkat sensor, grafik telemetry berjalan, alarm
  ambang batas yang dapat ditindaklanjuti menjadi Work Order.
- **Risiko, kinerja (AHI) dan biaya siklus hidup** sebagai dasar keputusan
  Keep / Maintain / Refurbish / Replace / Dispose.
- **Kepatuhan BMN**: rekonsiliasi SAKTI/SIMAN dan dossier disposal.
- **Keamanan siber**: aset sensitif, sanitisasi media mengacu NIST SP 800-88 Rev.2.
- **Persetujuan berbasis peran**, integrasi 7 sistem eksternal, dan pelaporan
  dengan ekspor PDF/Excel/CSV.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| **[SECURITY.md](SECURITY.md)** | Model keamanan, kelemahan yang diketahui, pengerasan wajib sebelum produksi |
| [docs/README.md](docs/README.md) | Indeks seluruh dokumentasi dan berkas paparan |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Arsitektur, alur render, keputusan teknis |
| [docs/MODUL.md](docs/MODUL.md) | Katalog 27 modul beserta fungsinya |
| [docs/HAK-AKSES.md](docs/HAK-AKSES.md) | Peran, matriks kewenangan, cara penegakannya |
| [docs/DATA.md](docs/DATA.md) | Model data, dataset, dan penyimpanan peramban |
| [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md) | Panduan pemakaian per peran dan alur kerja utama |
| [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md) | Cara menambah modul, formulir, peran; konvensi & pengujian |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Penempatan ke server dan verifikasinya |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan |

## Batasan purwarupa

- Tidak ada server aplikasi, basis data, maupun API. Data baru disimpan di
  `localStorage` peramban — per perangkat, per peramban.
- Hak akses adalah kontrol antarmuka, **bukan batas keamanan**.
- Integrasi SAKTI/SIMAN, HR, Finance, IoT dan lainnya ditampilkan sebagai
  status dan riwayat simulasi, belum terhubung ke sistem sungguhan.
- Ekspor PDF memakai dialog cetak peramban.

Rincian dan rencana pengerasan: [SECURITY.md](SECURITY.md).

## Lisensi dan kepemilikan

Hak cipta © 2026 Lembaga Pusat Kajian Manajemen Indonesia (LPKMI).
Penggunaan internal untuk keperluan kajian, demonstrasi dan pelatihan.
