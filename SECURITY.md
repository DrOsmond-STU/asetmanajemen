# Keamanan — SIMASET BMN

Dokumen ini menjelaskan model keamanan purwarupa SIMASET BMN: kontrol yang
sudah diterapkan, kelemahan yang diketahui dan diterima pada tahap purwarupa,
serta daftar pengerasan yang **wajib** dikerjakan sebelum sistem dipakai dengan
data sungguhan.

Dokumen terkait: [README](README.md) · [Hak Akses & Peran](docs/HAK-AKSES.md) ·
[Arsitektur](docs/ARSITEKTUR.md) · [Data & Penyimpanan](docs/DATA.md)

---

## 1. Peringatan utama

> **SIMASET BMN adalah purwarupa front-end tanpa server aplikasi.**
> Seluruh logika, data, dan pemeriksaan hak akses berjalan di peramban pengguna.

Konsekuensi yang harus dipahami semua pihak sebelum demo atau uji coba:

| Hal | Kenyataan pada purwarupa |
|---|---|
| Pemeriksaan hak akses (RBAC) | **Kontrol antarmuka, bukan batas keamanan.** Siapa pun yang membuka DevTools dapat mengubah perannya sendiri dan membuka modul apa pun. |
| Autentikasi | Pencocokan email/kata sandi di sisi peramban. Tidak ada sesi server, token, maupun verifikasi. |
| Kata sandi akun demo | Tersimpan **terbuka** di `assets/js/data.js` dan terisi otomatis pada halaman masuk. Bersifat publik, bukan rahasia. |
| Seluruh data | Dikirim ke peramban apa adanya. Tidak ada penyaringan data per peran di sisi server — karena tidak ada server. |
| Data yang ditambahkan pengguna | Disimpan di `localStorage` peramban, **tanpa enkripsi**, dan bertahan sampai dihapus manual. |

**Jangan memasukkan data BMN sungguhan, data pribadi, dokumen internal, atau
foto aset sensitif ke dalam purwarupa ini.** Gunakan data contoh saja.

---

## 2. Lingkup dan aset yang dilindungi

| Aset informasi | Lokasi pada purwarupa | Sensitivitas |
|---|---|---|
| Data aset BMN simulasi | `assets/js/data.js` (statis, publik) | Rendah — data contoh |
| Catatan yang ditambahkan pengguna | `localStorage: simaset_user_records_v1` | Rendah–sedang, tergantung isian pengguna |
| Foto aset / bukti pekerjaan | `localStorage: simaset_asset_photos_v1` dan di dalam catatan | **Sedang–tinggi** — foto dapat memuat ruangan, perangkat, atau dokumen |
| Keputusan persetujuan | `localStorage: simaset_approvals_v1` | Rendah |
| Identitas sesi pengguna aktif | `sessionStorage: simaset_user` | Rendah |

Perangkat bersama (laptop demo, komputer ruang rapat) adalah titik risiko
terbesar: `localStorage` tidak hilang saat tab ditutup. Lihat
[§6 Pembersihan data](#6-pembersihan-data-pada-perangkat-bersama).

---

## 3. Kontrol yang sudah diterapkan

Kontrol berikut **benar-benar ada** di dalam kode dan sudah diuji otomatis.

### 3.1 Kontrol akses berbasis peran (lapisan antarmuka)

Didefinisikan terpusat di [`assets/js/rbac.js`](assets/js/rbac.js) — matriks
10 peran × 27 modul dengan tiga tingkat: `R` (lihat), `RW` (lihat + ubah),
`A` (lihat + ubah + setujui).

Tiga titik penegakan di `assets/js/app.js`:

1. **Menu** — `renderSidebar()` hanya menampilkan modul yang lolos `canRead()`.
2. **Rute** — `route()` memanggil `canRead()` sebelum merender; modul di luar
   kewenangan menampilkan halaman *Akses Ditolak*, termasuk bila alamat
   (`#/modul`) diketik manual.
3. **Aksi** — tombol tambah/ubah hanya dirender bila `canWrite()`; tombol
   setujui hanya bila `canApprove()`. Peran baca-saja mendapat penanda
   *"Akses Lihat Saja"*.

Prinsip **deny-by-default**: modul yang tidak tercantum pada peta peran otomatis
tidak dapat diakses (`RBAC.level()` mengembalikan `-`).

### 3.2 Pencegahan XSS pada keluaran

- Seluruh data yang disisipkan ke HTML melewati `esc()` yang meng-escape
  `& < > " '`.
- Teks yang masuk ke SVG ilustrasi melewati `xmlEsc()`.
- Kolom tabel bertipe `html:true` (saat ini hanya kolom foto) adalah
  **pengecualian yang disengaja** dan hanya boleh diisi nilai yang sudah
  divalidasi — lihat §3.3.

### 3.3 Daftar-izin data URI untuk foto

Nilai foto berasal dari `localStorage`, yang dapat disunting pemilik peramban.
Tanpa penyaringan, nilai berisi tanda kutip dapat keluar dari atribut `src` dan
menjalankan skrip. Karena itu setiap penyisipan foto melewati `safePhotoSrc()`:

```js
const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);...base64,[A-Za-z0-9+/=]+$
                     |^data:image\/svg\+xml;charset=utf-8,[^"'<>]*$/i;
function safePhotoSrc(value){
  return (typeof value === 'string' && DATA_IMAGE_RE.test(value)) ? value : '';
}
```

Yang ditolak dan jatuh kembali ke ilustrasi kategori: `javascript:`,
`data:text/html`, URL eksternal (`https://…`), dan payload base64 yang disisipi
tanda kutip atau atribut (`…base64,x" onerror="…`).

Diuji otomatis: nilai jahat yang ditanam langsung ke `localStorage` tidak
tereksekusi dan `src` kembali ke ilustrasi.

### 3.4 Tanpa dependensi pihak ketiga saat runtime

Seluruh pustaka (Chart.js, qrcode-generator, JsBarcode) **di-host sendiri** di
`assets/js/vendor/`. Tidak ada tag `<script>` ke CDN, sehingga tidak ada risiko
*supply chain* dari skrip pihak ketiga saat aplikasi berjalan.

> Pengecualian: `index.html` dan `app/index.html` memuat Google Fonts dari
> `fonts.googleapis.com`. Ini permintaan CSS/font, bukan skrip, namun tetap
> membocorkan alamat IP pengunjung ke Google. Untuk lingkungan tertutup,
> host sendiri fontnya.

### 3.5 Pembatasan unggahan di sisi peramban

Foto dikompres ulang melalui `<canvas>` (maks 1024 px, JPEG kualitas 0,72)
sebelum disimpan. Efek sampingnya: berkas digambar ulang menjadi JPEG baru,
sehingga **metadata EXIF (termasuk koordinat GPS) ikut hilang** dan muatan
berbahaya di dalam berkas gambar asli tidak ikut tersimpan.

Kegagalan kuota penyimpanan ditangani eksplisit: perubahan dibatalkan dan
pengguna diberi tahu — tidak hilang diam-diam.

### 3.6 Lain-lain

- Tidak ada panggilan jaringan keluar, telemetri, maupun pelacak.
- Keluar aplikasi menghapus `sessionStorage`; membuka `app/index.html` tanpa
  sesi otomatis dialihkan ke halaman masuk.
- Repositori tidak memuat kunci API, token, atau kredensial infrastruktur.

---

## 4. Kelemahan yang diketahui (diterima pada tahap purwarupa)

| # | Kelemahan | Dampak | Status |
|---|---|---|---|
| K-01 | RBAC hanya di sisi peramban | Pengguna dapat mengubah peran sendiri lewat DevTools dan membuka seluruh modul | **Diterima** — tidak dapat diperbaiki tanpa server |
| K-02 | Kata sandi tersimpan terbuka di `data.js` | Kredensial demo bersifat publik | **Diterima** — akun demo memang untuk publik |
| K-03 | Seluruh dataset terkirim ke setiap pengguna | Peran terbatas tetap menerima seluruh data di peramban | **Diterima** — perlu penyaringan sisi server |
| K-04 | `localStorage` tidak terenkripsi dan persisten | Foto/catatan tertinggal di perangkat bersama | **Mitigasi parsial** — tersedia cara pembersihan (§6) |
| K-05 | Tanpa header keamanan (CSP, HSTS, X-Frame-Options) | Tidak ada pertahanan berlapis bila ada celah XSS | **Terbuka** — konfigurasi hosting, lihat §5.2 |
| K-06 | Jejak audit hanya tampilan | Catatan audit tidak dapat dipercaya sebagai bukti | **Diterima** — perlu audit trail sisi server |
| K-07 | Tanpa batas ukuran berkas sebelum dibaca | Berkas sangat besar dapat membuat tab tidak responsif | **Terbuka** — risiko rendah, hanya mengganggu diri sendiri |

---

## 5. Pengerasan wajib sebelum produksi

### 5.1 Aplikasi

- [ ] **Autentikasi di sisi server** — SSO/OIDC instansi, bukan pencocokan di peramban.
- [ ] **Kata sandi di-hash** (Argon2id/bcrypt) bila tetap memakai basis lokal; MFA untuk peran Admin, Cyber Officer, dan Management.
- [ ] **RBAC ditegakkan di API**, bukan hanya menu. Matriks pada `rbac.js` dipakai sebagai spesifikasi, implementasinya di server.
- [ ] **Penyaringan data per peran** — API hanya mengirim data yang berhak dilihat pemanggil.
- [ ] **Sesi aman** — cookie `HttpOnly`, `Secure`, `SameSite=Lax`, masa berlaku dan rotasi token.
- [ ] **Audit trail sisi server** yang tidak dapat diubah pengguna (siapa, kapan, aksi, nilai sebelum/sesudah).
- [ ] **Validasi masukan di server** untuk setiap field; jangan percaya validasi peramban.
- [ ] **Unggahan berkas**: batas ukuran, pemeriksaan tipe sungguhan (magic bytes), pemindaian antivirus, penyimpanan di luar docroot, penyajian lewat endpoint berwenang.
- [ ] **Klasifikasi foto aset** — foto ruang server/perangkat kripto diperlakukan sebagai informasi terbatas, dengan kontrol akses tersendiri.
- [ ] **Pembatasan laju** (rate limiting) pada endpoint masuk dan unggah.

### 5.2 Hosting dan jaringan

- [ ] HTTPS wajib + HSTS.
- [ ] Header keamanan — contoh titik awal:

  ```
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), geolocation=()
  ```

  > Catatan: `img-src data:` diperlukan karena foto disimpan sebagai data URI.
  > `camera=(self)` diperlukan agar pengambilan foto lewat kamera tetap jalan.
  > CSP tanpa `unsafe-inline` pada `script-src` akan memblokir skrip inline di
  > `index.html`; pindahkan skrip tersebut ke berkas terpisah lebih dulu.

- [ ] Direktori `.git/` tidak boleh dapat diakses publik — verifikasi
      `https://<domain>/.git/HEAD` mengembalikan 403/404.
- [ ] Nonaktifkan *directory listing*.
- [ ] Cadangan berkala dan uji pemulihan.

### 5.3 Proses

- [ ] Uji penetrasi sebelum go-live.
- [ ] Penilaian risiko dan *Statement of Applicability* bila menargetkan sertifikasi ISO/IEC 27001.
- [ ] Prosedur penanganan insiden dan kontak pelaporan yang jelas.

---

## 6. Pembersihan data pada perangkat bersama

Setelah demo di perangkat bersama, hapus data lokal:

- **Cara aplikasi:** keluar lewat menu pengguna (membersihkan sesi), lalu
- **Cara peramban:** DevTools → Application → Storage → *Clear site data*, atau
- **Cara konsol:**

  ```js
  localStorage.removeItem('simaset_user_records_v1');
  localStorage.removeItem('simaset_asset_photos_v1');
  localStorage.removeItem('simaset_approvals_v1');
  sessionStorage.clear();
  ```

Gunakan jendela penyamaran (incognito) untuk demo sekali pakai — seluruh data
hilang saat jendela ditutup.

---

## 7. Praktik pengembangan aman

Aturan yang wajib diikuti saat menambah kode:

1. **Selalu `esc()`** setiap nilai yang disisipkan ke HTML. Tidak ada
   pengecualian tanpa alasan tertulis.
2. **Kolom `html:true` dan `innerHTML` mentah** hanya boleh menerima nilai dari
   fungsi validator (seperti `safePhotoSrc`). Tulis validatornya lebih dulu.
3. **Jangan pernah** memakai `eval()`, `new Function()`, atau
   `element.setAttribute('on…', …)`.
4. **Jangan menambah skrip dari CDN.** Host sendiri di `assets/js/vendor/`.
5. **Perubahan matriks hak akses** hanya di `rbac.js`; jangan menanam
   pemeriksaan peran ad-hoc yang tersebar.
6. Jalankan ulang uji peran (lihat [docs/PENGEMBANGAN.md](docs/PENGEMBANGAN.md))
   setelah mengubah RBAC, menu, atau tombol aksi.

---

## 8. Melaporkan kerentanan

Temuan keamanan pada purwarupa ini dilaporkan ke pengelola repositori melalui
kanal internal Lembaga Pusat Kajian Manajemen Indonesia (LPKMI). Mohon sertakan:
langkah reproduksi, dampak, versi/commit, dan peramban yang dipakai. Jangan
membuka *issue* publik untuk temuan berdampak tinggi.

---

## 9. Riwayat perbaikan keamanan

| Tanggal | Perbaikan |
|---|---|
| 2026-10-03 | Penambahan `safePhotoSrc()` — daftar-izin data URI gambar pada seluruh titik penyisipan foto (detail aset, bukti Work Order/Inspeksi, thumbnail daftar, timeline riwayat, pratinjau formulir). Mencegah pelolosan atribut `src` dari nilai `localStorage` yang disunting. |
| 2026-09-13 | Penerapan RBAC: penyaringan menu, *guard* rute terhadap akses via alamat langsung, dan penyembunyian kontrol ubah untuk peran baca-saja. |
