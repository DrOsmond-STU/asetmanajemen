# Penempatan (Deployment)

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

## 1. Ringkasan lingkungan

| | |
|---|---|
| **Alamat produksi** | https://simaset.semestateknologiutama.com |
| **Jenis hosting** | cPanel (Domainesia) — static file hosting |
| **Docroot** | `/home/semestat/simaset.semestateknologiutama.com` |
| **Repositori** | `https://github.com/DrOsmond-STU/asetmanajemen.git` |
| **Branch yang dideploy** | `claude/asset-management-ui-prototype-xum2vt` |
| **Mekanisme** | cPanel Git Deployment — `git pull` + checkout ke docroot |

Tidak ada proses build: isi repositori disajikan apa adanya.

---

## 2. Alur penempatan

```
sunting kode ──> uji lokal ──> commit ──> push ke branch ──> picu deployment ──> verifikasi
```

1. **Uji lokal** — jalankan `python3 -m http.server 8080` dan uji peran
   terdampak ([PENGEMBANGAN.md §6](PENGEMBANGAN.md#6-pengujian)).
2. **Commit dan push** ke branch yang dideploy.
3. **Picu deployment** dari cPanel (Git Version Control → Deploy HEAD Commit),
   atau lewat alat pengelolaan hosting yang tersedia.
4. **Verifikasi** — lihat §3.

---

## 3. Memverifikasi hasil penempatan

Verifikasi yang tidak bergantung pada tampilan, berguna bila halaman
di-cache peramban:

**a. Commit yang terpasang** — baca `.git/HEAD` pada docroot server; nilainya
harus sama dengan commit yang baru dipush:

```bash
git rev-parse HEAD          # di mesin lokal
# bandingkan dengan isi <docroot>/.git/HEAD di server
```

**b. Ukuran berkas** — bandingkan ukuran byte berkas yang berubah:

```bash
for f in assets/js/app.js assets/js/modules.js assets/css/style.css; do
  printf "%-28s %s\n" "$f" "$(wc -c <"$f")"
done
```

Angkanya harus sama persis dengan ukuran berkas di docroot server. Ini
menangkap deployment separuh jalan yang tidak terlihat dari ukuran halaman.

**c. Uji fungsional** — buka aplikasi, masuk sebagai `custodian@simaset.go.id`:
harus tampil **10 menu**; ketik `#/master-data` pada alamat → harus muncul
**Akses Ditolak**.

> Bila tampilan tidak berubah setelah deployment, lakukan *hard reload*
> (Ctrl/Cmd + Shift + R) — berkas CSS/JS tidak berversi sehingga dapat
> tertahan di cache peramban.

---

## 4. Pemeriksaan keamanan pasca-penempatan

Lakukan setiap kali konfigurasi hosting berubah:

- [ ] `https://<domain>/.git/HEAD` mengembalikan **403/404**, bukan isi berkas.
      Deployment berbasis git menaruh direktori `.git/` di dalam docroot;
      bila terbuka, seluruh riwayat kode dapat diunduh publik.
- [ ] *Directory listing* nonaktif (`https://<domain>/assets/` tidak
      menampilkan daftar berkas).
- [ ] HTTPS aktif dan HTTP dialihkan ke HTTPS.
- [ ] Header keamanan terpasang — daftar yang disarankan ada di
      [SECURITY.md §5.2](../SECURITY.md#52-hosting-dan-jaringan).

---

## 5. Mengembalikan ke versi sebelumnya (rollback)

Karena deployment adalah checkout git, pengembalian dilakukan dengan
men-deploy commit sebelumnya:

```bash
git log --oneline -5              # cari commit yang stabil
git revert <commit-bermasalah>    # buat commit pembatal
git push
```

Lalu picu ulang deployment. Hindari mengubah riwayat (`reset --hard` + force
push) pada branch yang dipakai deployment.

---

## 6. Membangkitkan ulang dokumen pendamping

Dokumen Word/PDF daftar pengguna dibangkitkan dari kode (`rbac.js` dan
`data-ext.js`), bukan diketik ulang. Bila matriks hak akses atau daftar
pengguna berubah, bangkitkan ulang agar dokumen tidak berbeda dengan aplikasi.
Skrip pembangkitnya berada di luar repositori (ruang kerja pengembangan);
lihat riwayat commit untuk rujukan terakhir.

Dokumen yang terdampak:

- `docs/SIMASET-BMN-Daftar-Pengguna.docx` dan `.pdf`
- Tabel matriks pada [HAK-AKSES.md](HAK-AKSES.md)

---

## 7. Masalah yang pernah ditemui

| Gejala | Sebab | Penanganan |
|---|---|---|
| Perubahan tidak muncul walau deployment sukses | Deployment menunjuk **branch lain** | Periksa branch pada konfigurasi deployment; daftarkan ulang bila perlu |
| Berkas baru tidak ikut terpasang | Deployment lama berjalan sebelum push selesai | Picu ulang deployment, verifikasi lewat §3 |
| Halaman lama walau berkas server sudah baru | Cache peramban | Hard reload |
