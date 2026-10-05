// ==========================================================================
// Halaman masuk — memanggil /api/auth/login.
//
// Kata sandi tidak lagi diperiksa di peramban: verifikasi dilakukan server
// terhadap hash di basis data. Berkas data.js (yang dahulu memuat seluruh
// daftar akun) sudah tidak dimuat di halaman ini.
// ==========================================================================

(function(){
  'use strict';

  // Daftar akun demo: email, nama dan peran bersifat publik (lihat
  // docs/HAK-AKSES.md). Kata sandinya pun memang dipublikasikan untuk
  // keperluan peragaan; tidak ada satu pun akun nyata di sini.
  const DEMO_PASSWORD = 'simaset123';
  const DEMO_ACCOUNTS = [
    { role:'Super Admin',   email:'admin@simaset.go.id' },
    { role:'Asset Manager', email:'asset.manager@simaset.go.id' },
    { role:'BMN Officer',   email:'bmn.officer@simaset.go.id' },
    { role:'Finance',       email:'finance@simaset.go.id' },
    { role:'Maintenance',   email:'maintenance@simaset.go.id' },
    { role:'Inspector',     email:'inspector@simaset.go.id' },
    { role:'Custodian',     email:'custodian@simaset.go.id' },
    { role:'Cyber Officer', email:'cyber.officer@simaset.go.id' },
    { role:'Auditor',       email:'auditor@simaset.go.id' },
    { role:'Management',    email:'management@simaset.go.id' },
  ];

  const byId = (id)=> document.getElementById(id);

  byId('icon-mail-slot').innerHTML = icon('mail','');
  byId('icon-lock-slot').innerHTML = icon('lock','');

  // ---- Tampilkan / sembunyikan kata sandi --------------------------------
  const pwInput  = byId('password');
  const pwToggle = byId('pw-toggle');
  let pwVisible = false;
  function renderPwIcon(){ pwToggle.innerHTML = icon(pwVisible ? 'eyeOff' : 'eye',''); }
  renderPwIcon();
  pwToggle.addEventListener('click', ()=>{
    pwVisible = !pwVisible;
    pwInput.type = pwVisible ? 'text' : 'password';
    renderPwIcon();
  });

  // ---- Pintasan akun demo ------------------------------------------------
  const demoList = byId('demo-list');
  DEMO_ACCOUNTS.forEach(u=>{
    const c = RBAC.countByLevel(u.role);
    const total = c.R + c.RW + c.A;
    const el = document.createElement('div');
    el.className = 'demo-chip';
    el.innerHTML = `<b></b><span></span><span class="demo-perm"></span>`;
    el.querySelector('b').textContent = u.role;
    el.querySelector('span').textContent = u.email;
    el.querySelector('.demo-perm').textContent =
      `${total} modul${c.A ? ` · ${c.A} dapat disetujui` : ''}`;
    el.addEventListener('click', ()=>{
      byId('email').value    = u.email;
      byId('password').value = DEMO_PASSWORD;
    });
    demoList.appendChild(el);
  });

  // ---- Pesan ------------------------------------------------------------
  function showAlert(msg, kind){
    const box = byId('login-alert');
    box.innerHTML = `<div class="alert alert-${kind || 'error'}">${icon(kind === 'ok' ? 'checkCircle' : 'alertCircle','')}<div></div></div>`;
    // textContent: pesan galat berasal dari server, jangan disisipkan sebagai HTML.
    box.querySelector('div > div').textContent = msg;
  }
  function clearAlert(){ byId('login-alert').innerHTML = ''; }

  // ---- Kirim form -------------------------------------------------------
  const form = byId('login-form');
  const btn  = byId('login-btn');

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    clearAlert();
    const email = byId('email').value.trim();
    const pass  = byId('password').value;
    if(!email || !pass){ showAlert('Email dan kata sandi wajib diisi.'); return; }

    btn.disabled = true;
    const labelAsal = btn.textContent;
    btn.textContent = 'Memproses…';
    try{
      await API.login(email, pass);
      // Sesi kini dipegang cookie server; tidak ada data pengguna yang
      // disimpan di peramban.
      window.location.href = 'app/index.html#/dashboard';
    }catch(err){
      showAlert(err.message || 'Gagal masuk.');
      btn.disabled = false;
      btn.textContent = labelAsal;
      byId('password').focus();
      byId('password').select();
    }
  });

  // Jika sesi masih hidup, langsung masuk ke aplikasi.
  API.me().then(()=>{ window.location.href = 'app/index.html#/dashboard'; }).catch(()=>{});
})();
