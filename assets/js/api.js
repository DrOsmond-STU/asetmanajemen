// ==========================================================================
// SIMASET BMN — Klien API
// --------------------------------------------------------------------------
// Satu-satunya jalur komunikasi front-end dengan server. Sesi dipegang oleh
// cookie HttpOnly (tidak terbaca JavaScript); token CSRF disimpan di memori
// halaman dan dikirim pada setiap permintaan yang mengubah data.
// ==========================================================================

const API = (function(){

  // Jalur relatif agar tetap benar baik di akar domain maupun subdirektori.
  const BASE = (location.pathname.indexOf('/app/') !== -1 ? '../' : './') + 'api/';

  let csrf = null;

  function setCsrf(t){ if(typeof t === 'string' && t) csrf = t; }

  async function call(method, path, payload){
    const opts = {
      method,
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    };
    if(payload !== undefined){
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(payload);
    }
    if(method !== 'GET' && csrf) opts.headers['X-CSRF-Token'] = csrf;

    let res;
    try{
      res = await fetch(BASE + path, opts);
    }catch(e){
      throw new ApiError(0, 'Tidak dapat menghubungi server. Periksa koneksi Anda.');
    }

    let data = null;
    const text = await res.text();
    if(text){
      try{ data = JSON.parse(text); }
      catch(e){ throw new ApiError(res.status, 'Jawaban server tidak dapat dibaca.'); }
    }
    if(data && data.csrf) setCsrf(data.csrf);

    if(!res.ok || (data && data.ok === false)){
      const msg = (data && data.error) || 'Permintaan gagal (HTTP ' + res.status + ').';
      throw new ApiError(res.status, msg);
    }
    return data || {};
  }

  class ApiError extends Error {
    constructor(status, message){ super(message); this.name = 'ApiError'; this.status = status; }
    // Sesi habis atau token kedaluwarsa -> pengguna perlu masuk lagi.
    get needsLogin(){ return this.status === 401 || this.status === 419; }
    get isForbidden(){ return this.status === 403; }
  }

  return {
    ApiError,
    get csrf(){ return csrf; },
    setCsrf,

    login(email, password){ return call('POST', 'auth/login', { email, password }); },
    logout(){ return call('POST', 'auth/logout'); },
    me(){ return call('GET', 'auth/me'); },
    bootstrap(){ return call('GET', 'bootstrap'); },

    list(dataset){ return call('GET', 'records/' + encodeURIComponent(dataset)); },
    get(dataset, id){ return call('GET', 'records/' + encodeURIComponent(dataset) + '/' + encodeURIComponent(id)); },
    create(dataset, values){ return call('POST', 'records/' + encodeURIComponent(dataset), values); },
    update(dataset, id, values){ return call('PUT', 'records/' + encodeURIComponent(dataset) + '/' + encodeURIComponent(id), values); },
    remove(dataset, id){ return call('DELETE', 'records/' + encodeURIComponent(dataset) + '/' + encodeURIComponent(id)); },

    decide(approvalId, status){ return call('POST', 'approvals/' + encodeURIComponent(approvalId) + '/decide', { status }); },
    auditLog(limit){ return call('GET', 'audit-log?limit=' + (limit || 100)); },
  };
})();
