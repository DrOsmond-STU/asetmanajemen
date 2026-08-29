# SIMASET BMN — Purwarupa UI/UX

Purwarupa (prototype) antarmuka **Sistem Informasi Manajemen Aset BMN (SIMASET BMN)** — *Integrated Asset & BMN Lifecycle Management System* berbasis prinsip **ISO 55000/55001**, disusun berdasarkan dokumen *SIMASET BMN ISO 55000 POLTEK SSN v2.0 — Business Requirement & Functional Specification*.

Ini adalah **prototipe front-end statis** (tanpa backend/database sungguhan) untuk keperluan demonstrasi alur kerja, tata letak informasi dan interaksi UI/UX seluruh 21 modul yang dispesifikasikan pada dokumen BRD. Seluruh data yang tampil adalah **data dummy/simulasi** yang dibangkitkan secara terprogram agar realistis secara struktur, bukan data produksi.

## Menjalankan secara lokal

Karena murni HTML/CSS/JS statis, cukup jalankan static file server dari root proyek, misalnya:

```bash
npx http-server -p 8080
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080/index.html`.

## Struktur proyek

```
index.html                 # Halaman login
app/index.html              # Shell aplikasi (SPA) setelah login
assets/css/style.css        # Design system (tokens, layout, komponen)
assets/js/icons.js          # Set ikon inline SVG (tanpa dependensi eksternal)
assets/js/data.js           # Data dummy — 26 entitas sesuai data dictionary BRD
assets/js/modules.js        # Konfigurasi 21 modul (kolom, filter, KPI, label)
assets/js/app.js            # Router hash-based + rendering generik & kustom
assets/js/vendor/chart.umd.js  # Chart.js (di-self-host, tidak bergantung CDN)
```

## Akun demo

Login menerima salah satu dari 10 akun demo berikut (password sama untuk semua: `simaset123`), atau klik "Gunakan akun demo" pada halaman login untuk mengisi otomatis:

| Peran | Email |
|---|---|
| Super Admin | admin@simaset.go.id |
| Asset Manager | asset.manager@simaset.go.id |
| BMN Officer | bmn.officer@simaset.go.id |
| Finance | finance@simaset.go.id |
| Maintenance | maintenance@simaset.go.id |
| Inspector | inspector@simaset.go.id |
| Custodian | custodian@simaset.go.id |
| Cyber Officer | cyber.officer@simaset.go.id |
| Auditor | auditor@simaset.go.id |
| Management | management@simaset.go.id |

Sesi disimpan di `sessionStorage` browser — murni simulasi, tidak ada autentikasi/backend sungguhan.

## Cakupan modul (mengikuti Bab 9 BRD)

Dashboard Eksekutif, Master Data, BMN Register, Asset Lifecycle, QR/Barcode & Asset Tag, Sensus & Inventarisasi, Mutasi/IMACD, Custodian Management, JML Lifecycle, Maintenance & Work Order, Inspection & Condition, Risk & Criticality, Performance & Asset Health, Financial & Lifecycle Cost, SAKTI/SIMAN Reconciliation, Cyber Asset Management, Media Sanitization, BMN Disposal, ISO 55000/55001 Governance, Audit & Compliance, Document Management, Reporting & Executive Dashboard.

## Catatan desain

Referensi desain yang diminta (`qhse.semestateknologiutama.com`) tidak dapat diakses dari lingkungan pengembangan pada saat prototipe ini dibuat, sehingga desain disusun mandiri dengan gaya korporat/instansi pemerintah (sidebar navy, aksen biru & emas, kartu KPI, tabel data dengan filter dan drawer detail) yang selaras dengan konteks ISO 55000/BMN dan identitas kampus kedinasan siber. Silakan sesuaikan token warna pada `assets/css/style.css` (`:root`) apabila ingin menyelaraskan lebih dekat dengan sistem QHSE yang sudah berjalan.

## Tahap lanjutan

Sebagaimana disebutkan pada Bab 30 dokumen BRD, tahap berikutnya sebelum development adalah penyusunan SRS teknis: ERD fisik, data dictionary per tabel, spesifikasi API, wireframe/UI resmi, detail workflow approval, notification matrix dan UAT.
