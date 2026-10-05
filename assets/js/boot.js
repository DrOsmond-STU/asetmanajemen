// ==========================================================================
// SIMASET BMN — Pemuat aplikasi
// --------------------------------------------------------------------------
// Mengambil seluruh data yang boleh dibaca peran pengguna dari /api/bootstrap,
// lalu menjalankan SPA. Tanpa langkah ini app.js tidak punya data: berkas
// data.js sudah tidak lagi dikirim ke peramban.
// ==========================================================================

(function(){
  'use strict';

  const content = document.getElementById('content');

  function tampilkanPesan(judul, pesan, tombol){
    if(!content) return;
    content.innerHTML =
      '<div class="page-head"><div><h1></h1><p class="desc"></p></div></div>' +
      '<div class="panel"><div class="panel-body" id="boot-aksi"></div></div>';
    content.querySelector('h1').textContent = judul;
    content.querySelector('p').textContent = pesan;
    if(tombol){
      const b = document.createElement('button');
      b.className = 'btn btn-primary btn-sm';
      b.textContent = tombol.label;
      b.addEventListener('click', tombol.onClick);
      document.getElementById('boot-aksi').appendChild(b);
    }
  }

  function tampilkanMemuat(){
    if(!content) return;
    content.innerHTML =
      '<div class="panel"><div class="panel-body" style="padding:48px;text-align:center;color:var(--text-500)">' +
      'Memuat data dari server…</div></div>';
  }

  function keHalamanMasuk(){ window.location.href = '../index.html'; }

  async function mulai(){
    tampilkanMemuat();
    let res;
    try{
      res = await API.bootstrap();
    }catch(err){
      if(err instanceof API.ApiError && err.needsLogin){ keHalamanMasuk(); return; }
      tampilkanPesan(
        'Tidak dapat memuat data',
        (err && err.message) || 'Server tidak dapat dihubungi.',
        { label: 'Coba lagi', onClick: mulai }
      );
      return;
    }

    if(!res || !res.data || !res.user){
      tampilkanPesan('Data tidak lengkap', 'Server tidak mengirim data yang diharapkan.',
        { label: 'Coba lagi', onClick: mulai });
      return;
    }

    // Data yang dipakai seluruh modul. Dataset yang tidak boleh dibaca peran
    // ini dikirim server sebagai array kosong dan namanya tercantum pada
    // `restricted`, sehingga halaman dapat menyebutnya "tidak tersedia"
    // alih-alih menampilkan angka nol yang menyesatkan.
    window.SIMASET_DATA       = res.data;
    window.SIMASET_USER       = res.user;
    window.SIMASET_RESTRICTED = res.restricted || [];
    window.SIMASET_ACCESS     = res.access || null;

    if(typeof window.startSimaset !== 'function'){
      tampilkanPesan('Aplikasi gagal dimuat', 'Berkas app.js tidak termuat dengan benar.', null);
      return;
    }
    window.startSimaset();
  }

  mulai();
})();
