# Katalog Modul

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

27 modul dalam 10 kelompok navigasi. Kolom **Akses** menunjukkan peran yang
dapat membuka modul tersebut — rincian tingkat kewenangan ada di
[HAK-AKSES.md](HAK-AKSES.md).

---

## Utama

### Dashboard Eksekutif · `#/dashboard`
Ringkasan KPI seluruh portofolio aset: total aset, kondisi, aset kritis,
sebaran kategori, tren work order, dan rekomendasi lifecycle. Dapat dibuka
semua peran.

### Persetujuan Saya · `#/approval`
Antrean transaksi yang menunggu persetujuan. Isi antrean ditentukan matriks
hak akses: sebuah item hanya dapat disetujui peran yang memiliki tingkat `A`
pada modul terkait. Peran lain tetap dapat melihat antrean sebagai informasi.
Keputusan tersimpan di `localStorage`.

---

## Master & Register

### Master Data · `#/master-data`
Fondasi referensi seluruh transaksi: gedung, titik lokasi (ruang/lab),
kategori aset, dan unit kerja. Perubahan di sini memengaruhi seluruh modul
operasional.

### BMN Register · `#/bmn-register`
Register utama 62 aset. Setiap baris memuat **foto aset** (foto terunggah atau
ilustrasi kategori), Asset ID, identitas BMN, lokasi, custodian, kondisi,
criticality dan status. Laci detail bertab: Ringkasan (termasuk foto dan
Asset Health Index), Lokasi & Custodian, Riwayat, Risiko, Dokumen.

### Asset Lifecycle · `#/asset-lifecycle`
Sebaran aset pada tahap siklus hidup dan linimasa peristiwa lintas modul
(mutasi, maintenance, inspeksi).

### QR/Barcode & Asset Tag · `#/qr-tag`
Pembuatan **QR code dan barcode Code128 sungguhan** yang dapat dipindai,
lengkap dengan tampilan label siap cetak berisi logo, nama aset, NUP dan
Tag ID. Payload QR mengarah ke alamat tag aset.

---

## Operasional Lapangan

### Sensus & Inventarisasi · `#/sensus`
Rencana sensus per area, kemajuan pemindaian, dan **antrean anomali**:
Not Found, No Tag, Moved, Serial Mismatch, Duplicate, Unassigned, Damaged —
masing-masing dengan tindak lanjut yang disarankan.

### Mutasi / IMACD · `#/mutasi`
Permintaan perpindahan aset (Install, Move, Add, Change, Dispose) dengan
lokasi/custodian lama–baru, alasan, pemohon, dan jalur persetujuan.

### Custodian Management · `#/custodian`
Daftar pemegang tanggung jawab aset beserta portofolio dan jumlah aset yang
dipegang.

### JML Lifecycle · `#/jml`
Siklus Joiner–Mover–Leaver: penyerahan aset saat masuk, verifikasi saat
pindah, dan pengembalian serta clearance saat keluar.

---

## Pemeliharaan & Kondisi

### Maintenance & Work Order · `#/maintenance`
Work order preventif dan korektif: prioritas, teknisi, vendor, jadwal,
downtime, biaya, dan status. Pencatatan dapat dilampiri **foto aset/bukti
pekerjaan** langsung dari kamera perangkat.

### Inspection & Condition · `#/inspection`
Penilaian kondisi dengan enam parameter skor 1–5 (fisik, performa,
reliabilitas, keselamatan, maintenance, dokumentasi), temuan, rekomendasi,
dan **foto kondisi aset**.

### IoT & Telemetry · `#/iot`
10 perangkat sensor (MQTT, LoRaWAN, HTTP) yang memantau aset kritikal:
suhu, beban daya, tegangan, getaran, level BBM, uptime, dan status tamper.
Menampilkan grafik telemetry berjalan dengan garis ambang batas, serta alarm
yang dapat **ditindaklanjuti menjadi Work Order** dengan deskripsi terisi
otomatis.

---

## Risiko & Kinerja

### Risk & Criticality · `#/risk`
Risk register per aset: peristiwa risiko, likelihood × consequence, skor,
level, kontrol, residual risk, dan risk owner.

### Performance & Asset Health · `#/performance`
Availability, MTBF, MTTR, utilization, dan **Asset Health Index (AHI)**
multi-faktor yang menghasilkan rekomendasi Keep / Maintain / Refurbish /
Replace / Dispose.

### Financial & Lifecycle Cost · `#/financial`
Biaya sepanjang siklus hidup (akuisisi, operasi, pemeliharaan, upgrade,
disposal) sebagai dasar perhitungan TCO.

---

## BMN & Kepatuhan

### SAKTI/SIMAN Reconciliation · `#/reconciliation`
Batch rekonsiliasi terhadap Book of Record pemerintah: jumlah item, yang
cocok (*matched*), dan antrean *exception* yang menunggu sign-off.

### BMN Disposal · `#/disposal`
Usulan penghapusan: technical assessment, metode (lelang/hibah/pemusnahan),
status persetujuan, dan evidence pendukung.

---

## Keamanan Siber

### Cyber Asset Management · `#/cyber`
Aset sensitif (HSM, perangkat kripto, peralatan forensik) dengan klasifikasi
keamanan, custodian khusus, otorisasi, dan log akses.

### Media Sanitization · `#/sanitization`
Sanitisasi media mengacu **NIST SP 800-88 Rev.2**: metode (Clear/Purge/
Destroy), operator, verifikasi, dan nomor sertifikat — prasyarat sebelum
aset TI didisposal.

---

## Governance & Audit

### ISO 55000/55001 Governance · `#/governance`
Artefak tata kelola: kebijakan manajemen aset, sasaran dan KPI, SAMP,
management review, dan register continual improvement.

### Audit & Compliance · `#/audit`
Temuan audit dengan severity, root cause, corrective action, PIC, jatuh tempo,
dan penandaan temuan berulang.

### Document Management · `#/documents`
Register dokumen aset (BAST, kontrak, garansi, manual, sertifikat) dengan
versi, pengunggah, dan tanggal kedaluwarsa.

---

## Pelaporan

### Reporting & Executive Dashboard · `#/reporting`
Delapan jenis laporan dengan **pratinjau tata letak sungguhan** (kop, KPI,
tabel data) yang dapat dicetak atau diekspor ke PDF/Excel/CSV.

---

## Integrasi & Sistem

### Integrasi Sistem · `#/integrasi`
Status tujuh titik integrasi — SAKTI/SIMAN, HR/Personnel, Finance,
Procurement, DMS, Mobile (Sensus), IoT Gateway — beserta mekanisme, waktu
sinkronisasi terakhir/berikutnya, dan riwayat sinkronisasi termasuk kasus
gagal.

### Hak Akses & Peran · `#/access`
Matriks 27 modul × 10 peran dengan tingkat `R`/`RW`/`A`, rincian kewenangan
peran pengguna aktif, definisi seluruh peran, dan ekspor matriks ke CSV.
Dapat dibuka semua peran — inilah tempat memverifikasi bahwa menu yang tampil
sesuai aturan.

### Manajemen Pengguna · `#/users`
Daftar 15 pengguna beserta peran, unit kerja, status akun, MFA, dan cakupan
modul yang dihitung otomatis dari matriks RBAC. Detail pengguna menampilkan
rincian modul yang dapat disetujui/diubah/dilihat peran tersebut.
