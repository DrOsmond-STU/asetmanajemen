# Arsitektur

[← Kembali ke README](../README.md) · [Indeks dokumentasi](README.md)

## 1. Gambaran umum

SIMASET BMN adalah **Single Page Application statis** tanpa proses server.
Peramban memuat seluruh berkas sekali, lalu seluruh navigasi, perenderan,
penyimpanan dan pemeriksaan hak akses terjadi di sisi klien.

```
┌──────────────────────── Peramban pengguna ────────────────────────┐
│                                                                   │
│  index.html ──(masuk)──> app/index.html                           │
│      │                        │                                   │
│      │                        ├── icons.js     ikon SVG inline    │
│      │                        ├── data.js      dataset inti       │
│      │                        ├── data-ext.js  dataset tambahan   │
│      │                        ├── rbac.js      matriks hak akses  │
│      │                        ├── modules.js   registri modul     │
│      │                        └── app.js       router + render    │
│      │                                │                           │
│  sessionStorage                  localStorage                     │
│  simaset_user                    simaset_user_records_v1          │
│  (identitas sesi)                simaset_asset_photos_v1          │
│                                  simaset_approvals_v1             │
└───────────────────────────────────────────────────────────────────┘
          ▲
          │  HTTP statis (tanpa API)
   ┌──────┴───────┐
   │ Web server   │  cPanel/Apache — hanya menyajikan berkas
   └──────────────┘
```

Tidak ada panggilan jaringan keluar saat aplikasi berjalan, kecuali permintaan
font Google pada `<head>` (lihat [SECURITY.md §3.4](../SECURITY.md#34-tanpa-dependensi-pihak-ketiga-saat-runtime)).

## 2. Urutan muat berkas

Urutan ini **wajib dipertahankan** karena setiap berkas bergantung pada yang
sebelumnya:

| # | Berkas | Menyediakan | Bergantung pada |
|---|---|---|---|
| 1 | `icons.js` | `ICONS`, `icon()` | — |
| 2 | `data.js` | `SIMASET_DATA` (dataset inti) | — |
| 3 | `data-ext.js` | menambahkan `users`, `iot_*`, `integrations`, `sync_logs`, `approvals` | `SIMASET_DATA` |
| 4 | `rbac.js` | `RBAC`, `RBAC_MODULES`, `ROLE_DEFS`, `ROLE_ACCESS` | — |
| 5 | `modules.js` | `MODULES`, `NAV_GROUPS`, `NAV_ITEMS`, helper badge/format | `RBAC` (pada kolom modul pengguna) |
| 6 | `app.js` | seluruh perilaku aplikasi | semuanya |

`app.js` dibungkus IIFE sehingga tidak mencemari lingkup global. Dua fungsi
sengaja diekspor ke `window` karena dipakai oleh konfigurasi kolom di
`modules.js`: `assetPhotoSrc` dan `safePhotoSrc`.

## 3. Alur perenderan

```
hashchange ──> route()
                 ├── destroyCharts() + clearTimers() + closeDrawer()
                 ├── renderSidebar(hash)        ← disaring RBAC.canRead()
                 ├── canRead(hash)?  ─ tidak ─> renderDenied()
                 └── ya
                      ├── cfg.custom ada?  ─> renderer khusus
                      │     master-data · lifecycle · sensus · reconciliation
                      │     cyber · governance · iot · integrasi · approval · access
                      └── tidak ─> mountListPage(cfg)   ← generik
```

### Halaman generik (`mountListPage`)

Satu fungsi melayani sebagian besar modul. Ia membaca konfigurasi dari
`MODULES[id]` lalu menyediakan: pencarian, filter, kartu KPI, tabel
berpaginasi, ekspor CSV, tombol *Tambah Baru*, dan laci detail.

Konfigurasi minimum sebuah modul generik:

```js
'nama-modul': {
  group:'kinerja', title:'Judul Modul', icon:'barChart', desc:'…',
  dataset:'nama_dataset', idKey:'kolom_id',
  searchKeys:['…'], filters:[{key:'status', label:'Status'}],
  columns:[{key:'id', label:'ID', cls:'cell-mono'}, …],
  kpis:(rows)=>[{label:'…', value:rows.length, icon:'box', tint:'blue'}],
}
```

### Halaman khusus

Modul dengan tata letak yang tidak cocok dengan pola tabel memakai renderer
sendiri (ditandai `custom:'…'` pada registri) — misalnya IoT & Telemetry
(grafik telemetry berjalan), Integrasi Sistem (kartu status + riwayat), dan
Hak Akses & Peran (matriks peran × modul).

## 4. Penyimpanan data

| Lapisan | Isi | Sifat |
|---|---|---|
| `data.js` + `data-ext.js` | dataset simulasi bawaan | statis, hanya baca, ikut repositori |
| `localStorage: simaset_user_records_v1` | catatan yang ditambahkan pengguna, per dataset | bertahan lintas sesi |
| `localStorage: simaset_asset_photos_v1` | foto aset master, `asset_id` → data URI | bertahan lintas sesi |
| `localStorage: simaset_approvals_v1` | keputusan setujui/tolak | bertahan lintas sesi |
| `sessionStorage: simaset_user` | identitas pengguna aktif | hilang saat tab ditutup |

Saat aplikasi dimuat, `loadUserRecords()` menggabungkan catatan dari
`localStorage` ke dalam array dataset di memori — dataset bawaan di
`data.js` tidak pernah ditulisi. Rincian: [DATA.md](DATA.md).

## 5. Keputusan teknis dan alasannya

| Keputusan | Alasan |
|---|---|
| Vanilla JS tanpa framework | Purwarupa harus dapat dibuka langsung dari static host mana pun, tanpa build step, bundler, atau toolchain |
| Pustaka di-host sendiri | Menghilangkan ketergantungan CDN dan risiko *supply chain* saat runtime |
| Registri modul berbasis data | Menambah modul cukup menambah objek konfigurasi, bukan menulis halaman baru |
| Matriks RBAC terpusat di satu berkas | Aturan akses dapat diaudit dan diubah di satu tempat; dokumen Word/PDF dibangkitkan dari berkas yang sama |
| Foto dikompres di `<canvas>` | Muat dalam kuota `localStorage`, sekaligus membuang metadata EXIF |
| Foto disimpan pada kunci terpisah | Catatan transaksi tetap ringkas; foto aset master tidak menggandakan data |
| Router berbasis hash | Tidak memerlukan konfigurasi *rewrite* di server |

## 6. Batas kemampuan

- Tidak ada API, basis data, maupun sinkronisasi antar perangkat.
- Kuota `localStorage` (±5 MB per origin) membatasi jumlah foto yang dapat
  disimpan; kegagalan kuota ditangani dan diberitahukan ke pengguna.
- RBAC adalah kontrol antarmuka — lihat [SECURITY.md](../SECURITY.md).
- Ekspor PDF memakai dialog cetak peramban, bukan pembangkit PDF sisi server.
