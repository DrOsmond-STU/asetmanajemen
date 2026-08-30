// ==========================================================================
// SIMASET BMN — Purwarupa SPA logic (vanilla JS, hash router)
// ==========================================================================

(function(){

  // ---- Auth guard --------------------------------------------------------
  let CURRENT_USER = null;
  try{ CURRENT_USER = JSON.parse(sessionStorage.getItem('simaset_user')); }catch(e){}
  if(!CURRENT_USER){
    window.location.href = '../index.html';
    return;
  }

  const D = SIMASET_DATA;
  let activeCharts = [];
  function destroyCharts(){ activeCharts.forEach(c=>{ try{c.destroy();}catch(e){} }); activeCharts = []; }

  // ---- Persistence for data added through the prototype -------------------
  // Purwarupa tidak memiliki backend; data baru disimpan pada localStorage
  // browser (per perangkat/browser) sehingga tetap ada saat halaman dimuat
  // ulang, tanpa mengubah data dummy asal pada assets/js/data.js.
  const LS_KEY = 'simaset_user_records_v1';
  let USER_RECORDS = {};
  function getDatasetArray(key){
    // supports dot-path for nested datasets, e.g. "governance.improvement"
    return key.split('.').reduce((o,k)=> (o ? o[k] : undefined), D);
  }
  function loadUserRecords(){
    try{ USER_RECORDS = JSON.parse(localStorage.getItem(LS_KEY)) || {}; }catch(e){ USER_RECORDS = {}; }
    Object.keys(USER_RECORDS).forEach(key=>{
      const arr = getDatasetArray(key);
      if(Array.isArray(arr) && Array.isArray(USER_RECORDS[key])) arr.push(...USER_RECORDS[key]);
    });
  }
  function saveUserRecord(datasetKey, record){
    const arr = getDatasetArray(datasetKey);
    if(!Array.isArray(arr)) return;
    arr.push(record);
    if(!USER_RECORDS[datasetKey]) USER_RECORDS[datasetKey] = [];
    USER_RECORDS[datasetKey].push(record);
    try{ localStorage.setItem(LS_KEY, JSON.stringify(USER_RECORDS)); }catch(e){ /* storage unavailable */ }
  }
  loadUserRecords();

  // Generate the next sequential ID following an existing record's ID pattern,
  // e.g. rows with "AST-2026-000062" -> next "AST-2026-000063".
  function nextId(rows, idKey){
    let maxNum = 0, width = 3, prefix = 'ID-';
    rows.forEach(r=>{
      const v = String(r[idKey]||'');
      const m = v.match(/^(.*?)(\d+)$/);
      if(m){
        const num = parseInt(m[2], 10);
        if(num >= maxNum){ maxNum = num; width = m[2].length; prefix = m[1]; }
      }
    });
    return prefix + String(maxNum + 1).padStart(width, '0');
  }
  function todayStr(){ return new Date().toISOString().slice(0,10); }

  // ---- QR code & barcode rendering -----------------------------------------
  // qrcode-generator (global `qrcode`) and JsBarcode (global `JsBarcode`) are
  // self-hosted under assets/js/vendor/ so label generation works fully offline.
  function qrSVG(text){
    try{
      const qr = qrcode(0, 'M'); // typeNumber 0 = auto-detect smallest size
      qr.addData(String(text));
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 2 });
    }catch(e){
      return `<div class="text-muted" style="font-size:11px">QR tidak dapat dibuat</div>`;
    }
  }
  function barcodeSVG(text){
    try{
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      JsBarcode(svg, String(text), { format:'CODE128', displayValue:true, fontSize:12, height:42, margin:6, background:'#ffffff', lineColor:'#0f172a' });
      return svg.outerHTML;
    }catch(e){
      return `<div class="text-muted" style="font-size:11px">Barcode tidak dapat dibuat</div>`;
    }
  }
  function tagLabelCardHtml(tag, asset){
    return `
      <div class="tag-label-card">
        <div class="tl-org">${esc(D.org)}</div>
        <div class="tl-name">${esc(asset ? asset.name : (tag.asset_id||'—'))}</div>
        <div class="tl-qr">${qrSVG(tag.qr_payload || tag.tag_id)}</div>
        <div class="tl-barcode">${barcodeSVG(tag.tag_id)}</div>
        <div class="tl-nup">${esc(asset ? asset.bmn_uid : (tag.bmn_uid||'-'))}</div>
        <div class="tl-id">${esc(tag.tag_id)} · Material: ${esc(tag.material||'-')}</div>
      </div>`;
  }
  function openTagPrintView(tag, asset){
    const root = document.createElement('div');
    root.className = 'tag-print-overlay';
    root.innerHTML = `
      <div class="tp-toolbar" style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary btn-sm" id="tp-print">${icon('printer')}Cetak / Simpan PDF</button>
        <button class="btn btn-outline btn-sm" id="tp-close" style="background:#fff">${icon('x')}Tutup</button>
      </div>
      ${tagLabelCardHtml(tag, asset)}
    `;
    document.body.appendChild(root);
    root.querySelector('#tp-print').addEventListener('click', ()=> window.print());
    root.querySelector('#tp-close').addEventListener('click', ()=> root.remove());
    root.addEventListener('click', e=>{ if(e.target===root) root.remove(); });
  }

  function esc(s){
    if(s==null) return '';
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function initials(name){
    return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  }

  // ---- Topbar / user ------------------------------------------------------
  qs('#sb-logo').innerHTML = icon('lpkmi');
  qs('#sb-logo').querySelector('svg').style.cssText='width:24px;height:24px;color:#fff';
  qs('#collapse-icon').innerHTML = icon('chevronsLeft');
  qs('#hamburger-btn').innerHTML = icon('menu');
  qs('#search-icon').innerHTML = icon('search');
  qs('#bell-icon').innerHTML = icon('bell');
  qs('#settings-icon').innerHTML = icon('settings');
  qs('#chevron-icon').innerHTML = icon('chevronDown');
  qs('#user-name').textContent = CURRENT_USER.name;
  qs('#user-role').textContent = CURRENT_USER.role;
  qs('#user-avatar').textContent = initials(CURRENT_USER.name) || 'U';

  qs('#user-menu').addEventListener('click', ()=>{
    if(confirm('Keluar dari SIMASET BMN?')){
      sessionStorage.removeItem('simaset_user');
      window.location.href = '../index.html';
    }
  });
  qs('#notif-btn').addEventListener('click', ()=> toast('3 notifikasi baru: 1 overdue WO, 2 exception rekonsiliasi.'));
  qs('#settings-btn').addEventListener('click', ()=> toast('Pengaturan akun tidak tersedia pada purwarupa ini.'));

  const shell = qs('#app-shell');
  qs('#collapse-btn').addEventListener('click', ()=> shell.classList.toggle('collapsed'));
  qs('#hamburger-btn').addEventListener('click', ()=> shell.classList.toggle('mobile-open'));

  function toast(msg, kind){
    const root = qs('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon('checkCircle')}<span>${esc(msg)}</span>`;
    root.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='.25s'; setTimeout(()=>el.remove(),260); }, 3200);
  }

  // ---- Sidebar nav ---------------------------------------------------------
  function renderSidebar(activeId){
    const nav = qs('#sidebar-nav');
    let html = '';
    NAV_GROUPS.forEach(g=>{
      const items = NAV_ITEMS.filter(it=>it.group===g.id);
      if(!items.length) return;
      html += `<div class="nav-group-label">${esc(g.label)}</div>`;
      items.forEach(it=>{
        const isActive = it.id===activeId;
        html += `<div class="nav-item ${isActive?'active':''}" data-route="${it.id}">${icon(it.icon)}<span class="label">${esc(it.title)}</span></div>`;
      });
    });
    nav.innerHTML = html;
    nav.querySelectorAll('.nav-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        window.location.hash = '#/'+el.dataset.route;
        shell.classList.remove('mobile-open');
      });
    });
  }

  // ---- Generic building blocks ---------------------------------------------
  function pageHead({crumb, title, desc, actions}){
    return `
    <div class="page-head">
      <div>
        <div class="breadcrumb">${esc(crumb||'SIMASET BMN')} <span>/</span> <b style="color:var(--text-700)">${esc(title)}</b></div>
        <h1>${esc(title)}</h1>
        ${desc?`<p class="desc">${esc(desc)}</p>`:''}
      </div>
      <div class="page-actions">${actions||''}</div>
    </div>`;
  }

  function kpiCardsHtml(kpis){
    return `<div class="kpi-grid">${kpis.map(k=>`
      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-icon tint-${k.tint||'blue'}">${icon(k.icon||'info')}</div>
          ${k.trend?`<span class="kpi-trend ${k.trend.dir}">${icon(k.trend.dir==='up'?'arrowUp':k.trend.dir==='down'?'arrowDown':'minus')}${esc(k.trend.text)}</span>`:''}
        </div>
        <div class="kpi-value">${esc(k.value)}</div>
        <div class="kpi-label">${esc(k.label)}</div>
      </div>`).join('')}</div>`;
  }

  function badgeHtml(text, cls){
    return `<span class="badge ${cls}"><span class="dot-status" style="background:currentColor"></span>${esc(text)}</span>`;
  }

  // Generic list-page controller (search + filters + pagination + drawer)
  function mountListPage(config, options){
    options = options || {};
    const rows = options.rows || D[config.dataset] || [];
    const state = { search:'', filters:{}, page:1, pageSize: options.pageSize || 8 };
    let lastFiltered = rows;

    function applyFilters(){
      let out = rows;
      if(state.search){
        const s = state.search.toLowerCase();
        out = out.filter(r => (config.searchKeys||[]).some(k => String(r[k]||'').toLowerCase().includes(s)));
      }
      Object.entries(state.filters).forEach(([k,v])=>{
        if(v) out = out.filter(r => String(r[k]) === v);
      });
      return out;
    }

    function uniqueValues(key){
      return [...new Set(rows.map(r=>r[key]).filter(Boolean))].sort();
    }

    function draw(){
      const filtered = applyFilters();
      lastFiltered = filtered;
      const totalPages = Math.max(1, Math.ceil(filtered.length/state.pageSize));
      state.page = Math.min(state.page, totalPages);
      const pageRows = filtered.slice((state.page-1)*state.pageSize, state.page*state.pageSize);

      qs('#list-kpis').innerHTML = kpiCardsHtml(config.kpis(rows));

      // table
      const cols = config.columns;
      let thead = '<tr>' + cols.map(c=>`<th>${esc(c.label)}</th>`).join('') + '</tr>';
      let tbody = '';
      if(!pageRows.length){
        tbody = `<tr><td colspan="${cols.length}"><div class="table-empty">${icon('search')}<div>Tidak ada data yang cocok dengan filter saat ini.</div></div></td></tr>`;
      } else {
        pageRows.forEach(r=>{
          tbody += `<tr data-id="${esc(r[config.idKey])}">` + cols.map(c=>{
            const val = c.render ? c.render(r) : r[c.key];
            if(c.badge){ return `<td>${badgeHtml(val, c.badge(r))}</td>`; }
            return `<td class="${c.cls||''}">${esc(val==null?'-':val)}</td>`;
          }).join('') + '</tr>';
        });
      }
      qs('#list-table-head').innerHTML = thead;
      qs('#list-table-body').innerHTML = tbody;
      qs('#list-table-body').querySelectorAll('tr[data-id]').forEach(tr=>{
        tr.addEventListener('click', ()=>{
          const row = rows.find(r=>String(r[config.idKey])===tr.dataset.id);
          if(config.detailIsAsset) openAssetDetail(row.asset_id);
          else if(config.detailIsTag) openTagDetail(row);
          else if(config.detailIsReport) openReportViewer(row);
          else openGenericDetail(config, row, options.detailExtra ? options.detailExtra(row) : null);
        });
      });

      qs('#list-count').textContent = `${filtered.length} dari ${rows.length} data`;

      // pagination
      let pgHtml = `<button data-pg="prev" ${state.page<=1?'disabled':''}>${icon('chevronLeft').replace('class=""','style="width:14px;height:14px"')}</button>`;
      for(let p=1;p<=totalPages;p++){
        if(totalPages>7 && Math.abs(p-state.page)>2 && p!==1 && p!==totalPages){
          if(p===2||p===totalPages-1) pgHtml += `<span style="padding:0 3px;color:var(--text-400)">…</span>`;
          continue;
        }
        pgHtml += `<button data-pg="${p}" class="${p===state.page?'active':''}">${p}</button>`;
      }
      pgHtml += `<button data-pg="next" ${state.page>=totalPages?'disabled':''}>›</button>`;
      qs('#list-pagination-btns').innerHTML = pgHtml;
      qs('#list-pagination-btns').querySelectorAll('button[data-pg]').forEach(b=>{
        b.addEventListener('click', ()=>{
          if(b.dataset.pg==='prev') state.page--;
          else if(b.dataset.pg==='next') state.page++;
          else state.page = parseInt(b.dataset.pg);
          draw();
        });
      });
    }

    const filterBarHtml = `
      <div class="filter-bar">
        <div class="filter-search">${icon('search')}<input class="input" id="list-search" placeholder="Cari ${esc(config.title.toLowerCase())}…"></div>
        ${(config.filters||[]).map(f=>`
          <select class="input" id="filter-${f.key}">
            <option value="">${esc(f.label)}: Semua</option>
            ${uniqueValues(f.key).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>`).join('')}
        <span class="filter-count" id="list-count"></span>
      </div>`;

    const hasAddForm = !!FORM_CONFIGS[options.moduleId];
    qs('#content').innerHTML = `
      ${pageHead({title:config.title, desc:config.desc, actions: options.actionsHtml || `
        <button class="btn btn-outline btn-sm" id="export-btn">${icon('download')}Ekspor CSV</button>
        ${hasAddForm ? `<button class="btn btn-primary btn-sm" id="add-btn">${icon('plus')}Tambah Baru</button>` : ''}`})}
      <div id="list-kpis"></div>
      <div class="panel">
        <div class="panel-body" style="padding-bottom:0">${filterBarHtml}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead id="list-table-head"></thead>
            <tbody id="list-table-body"></tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="pg-info" id="list-pagination-info">Menampilkan hasil</span>
          <div class="pg-btns" id="list-pagination-btns"></div>
        </div>
      </div>
      ${options.extraHtml || ''}
    `;

    qs('#list-search').addEventListener('input', e=>{ state.search = e.target.value; state.page=1; draw(); });
    (config.filters||[]).forEach(f=>{
      qs('#filter-'+f.key).addEventListener('change', e=>{ state.filters[f.key]=e.target.value; state.page=1; draw(); });
    });
    const exportBtn = qs('#export-btn');
    if(exportBtn) exportBtn.addEventListener('click', ()=>{
      const idOrTitle = (options.moduleId || config.title || 'data').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-');
      exportCSV(`simaset-${idOrTitle}.csv`, config.columns, lastFiltered);
    });
    const addBtn = qs('#add-btn');
    if(addBtn) addBtn.addEventListener('click', ()=> openAddForm(options.moduleId || config.title));

    draw();
    if(options.afterMount) options.afterMount(rows, draw);
  }

  // ---- Drawer (detail) ------------------------------------------------------
  function openDrawer(innerHtml){
    qs('#drawer-root').innerHTML = `
      <div class="overlay" id="drawer-overlay">
        <div class="drawer">${innerHtml}</div>
      </div>`;
    qs('#drawer-overlay').addEventListener('click', e=>{ if(e.target.id==='drawer-overlay') closeDrawer(); });
    document.addEventListener('keydown', escCloseOnce);
    const closeBtn = qs('.drawer-close');
    if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
  }
  function escCloseOnce(e){ if(e.key==='Escape'){ closeDrawer(); } }
  function closeDrawer(){ qs('#drawer-root').innerHTML=''; document.removeEventListener('keydown', escCloseOnce); }

  function defGrid(row, fields){
    return `<div class="def-grid">${fields.filter(k=>row[k]!==undefined).map(k=>{
      let v = row[k];
      if(k==='amount'||k==='value'||k==='cost') v = fmtIDR(v);
      else if(typeof v==='boolean') v = v ? 'Ya' : 'Tidak';
      else if(/date|_at$|expiry|due_date/.test(k) && v) v = fmtDate(v);
      else if(v===null||v==='') v='—';
      return `<div class="def-item"><span class="k">${esc(fLabel(k))}</span><span class="v">${esc(v)}</span></div>`;
    }).join('')}</div>`;
  }

  // =============================================================================
  // TAMBAH DATA — form generik berbasis konfigurasi per modul
  // =============================================================================
  function staticOpts(arr){ return arr.map(v=>({value:v, label:v})); }
  function optsAssets(filterFn){ return D.assets.filter(filterFn||(()=>true)).map(a=>({value:a.asset_id, label:`${a.asset_id} — ${a.name}`})); }
  function optsCustodianNames(){ return staticOpts(D.custodians.map(c=>c.name)); }
  function optsLocationLabels(){ return staticOpts(D.locations.map(l=>l.label)); }
  function optsBuildingNames(){ return staticOpts(D.buildings.map(b=>b.name)); }
  function assetById(id){ return D.assets.find(a=>a.asset_id===id); }

  const FORM_CONFIGS = {
    'bmn-register': {
      title:'Tambah Aset Baru', dataset:'assets',
      fields:[
        {key:'name', label:'Nama Aset', type:'text', required:true, placeholder:'mis. Laptop Dell Latitude'},
        {key:'category', label:'Kategori', type:'select', required:true, options:()=>staticOpts(D.categories.map(c=>c.name))},
        {key:'brand', label:'Merk', type:'text'},
        {key:'model', label:'Model', type:'text'},
        {key:'serial', label:'Serial Number', type:'text'},
        {key:'year', label:'Tahun Perolehan', type:'number', default:()=>new Date().getFullYear(), min:2000, max:2030},
        {key:'value', label:'Nilai Perolehan (Rp)', type:'number', min:0, step:1000, placeholder:'0'},
        {key:'location_label', label:'Lokasi', type:'select', required:true, options:optsLocationLabels},
        {key:'custodian_name', label:'Custodian', type:'select', options:optsCustodianNames},
        {key:'condition_score', label:'Kondisi', type:'select', required:true, default:'4', options:()=>[5,4,3,2,1].map(n=>({value:String(n), label:['','1 - Rusak Berat','2 - Kurang','3 - Cukup','4 - Baik','5 - Sangat Baik'][n]}))},
        {key:'criticality', label:'Criticality', type:'select', default:'Medium', options:()=>staticOpts(['Low','Medium','High','Critical'])},
        {key:'status', label:'Status', type:'select', default:'In Use', options:()=>staticOpts(['In Use','Reserved','Under Maintenance','In Storage'])},
      ],
      build(v){
        const id = nextId(D.assets, 'asset_id');
        const seq = D.assets.length + 1;
        const kodeBarang = '3.9.9.99';
        const nup = String(seq).padStart(6,'0');
        const satker = (D.assets[0] && D.assets[0].satker) || '677321';
        const tagId = nextId(D.asset_tags, 'tag_id');
        const catCode = (D.categories.find(c=>c.name===v.category)||{}).code || 'BMN-UM';
        const loc = D.locations.find(l=>l.label===v.location_label);
        const cust = D.custodians.find(c=>c.name===v.custodian_name);
        const condScore = parseInt(v.condition_score,10)||4;
        const condLabels = {1:'1 - Rusak Berat',2:'2 - Kurang',3:'3 - Cukup',4:'4 - Baik',5:'5 - Sangat Baik'};
        return {
          asset_id:id, bmn_uid:`${satker}-${kodeBarang}-${nup}`, satker, kode_barang:kodeBarang, nup,
          name:v.name, category:v.category, category_code:catCode, brand:v.brand||'-', model:v.model||'-', serial:v.serial||'-',
          year:parseInt(v.year,10)||new Date().getFullYear(), value:parseInt(v.value,10)||0,
          warranty_until:'-', location_id: loc?loc.location_id:'-', location_label:v.location_label,
          custodian_id: cust?cust.custodian_id:'-', custodian_name:v.custodian_name||'-', unit: cust?cust.unit:'-',
          condition_score:condScore, condition_label:condLabels[condScore], criticality:v.criticality||'Medium',
          risk_level:'Medium', status:v.status||'In Use', tag_id:tagId, sensitive:catCode==='CYB',
        };
      },
      afterAdd(record){
        saveUserRecord('asset_tags', {
          tag_id: record.tag_id, asset_id: record.asset_id, bmn_uid: record.bmn_uid,
          qr_payload:`https://simaset.semestateknologiutama.com/t/${record.tag_id}`,
          material:'Standard PVC', print_batch:'BATCH-BARU', status:'Belum Dicetak', printed_at: todayStr(),
        });
      },
      successMsg:'Aset baru berhasil didaftarkan (tag QR/Barcode otomatis dibuat).',
      onDone(record){ route(); setTimeout(()=> openAssetDetail(record.asset_id), 250); },
    },

    'qr-tag': {
      title:'Terbitkan Tag Baru', dataset:'asset_tags',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'material', label:'Material Label', type:'select', default:'Standard PVC', options:()=>staticOpts(['Standard PVC','Durable Metal','Tamper-Evident','Heat Resistant'])},
        {key:'print_batch', label:'Batch Cetak', type:'text', default:()=>'BATCH-'+String(Math.floor(Math.random()*900)+100)},
        {key:'status', label:'Status', type:'select', default:'Belum Dicetak', options:()=>staticOpts(['Belum Dicetak','Terpasang'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        const tagId = nextId(D.asset_tags, 'tag_id');
        return { tag_id:tagId, asset_id:v.asset_id, bmn_uid:a?a.bmn_uid:'-', qr_payload:`https://simaset.semestateknologiutama.com/t/${tagId}`, material:v.material||'Standard PVC', print_batch:v.print_batch||'BATCH-BARU', status:v.status||'Belum Dicetak', printed_at: todayStr() };
      },
      successMsg:'Tag baru diterbitkan — QR code dan barcode siap dicetak.',
      onDone(record){ route(); setTimeout(()=> openTagDetail(record), 250); },
    },

    'mutasi': {
      title:'Ajukan Mutasi / IMACD', dataset:'mutasi',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'change_type', label:'Jenis Perubahan', type:'select', required:true, options:()=>staticOpts(['Install','Move','Add','Change','Disposal-related'])},
        {key:'new_location', label:'Lokasi Baru', type:'select', options:optsLocationLabels},
        {key:'new_custodian', label:'Custodian Baru', type:'select', options:optsCustodianNames},
        {key:'requestor', label:'Pemohon', type:'text', default:()=>CURRENT_USER.name},
        {key:'approver', label:'Approver', type:'select', options:()=>staticOpts(['Kepala Unit Infrastruktur TI','Asset Manager','Kabag Sarpras'])},
        {key:'reason', label:'Alasan', type:'textarea', full:true},
        {key:'status', label:'Status', type:'select', default:'Menunggu Persetujuan', options:()=>staticOpts(['Menunggu Persetujuan','Dalam Proses','Selesai','Ditolak'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { request_id: nextId(D.mutasi,'request_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', change_type:v.change_type,
          old_location:a?a.location_label:'-', new_location:v.new_location||(a?a.location_label:'-'),
          old_custodian:a?a.custodian_name:'-', new_custodian:v.new_custodian||(a?a.custodian_name:'-'),
          requestor:v.requestor||CURRENT_USER.name, approver:v.approver||'Asset Manager', status:v.status||'Menunggu Persetujuan',
          request_date: todayStr(), reason:v.reason||'-' };
      },
      successMsg:'Permintaan mutasi/IMACD berhasil diajukan.',
    },

    'custodian': {
      title:'Tambah Custodian', dataset:'custodians',
      fields:[
        {key:'name', label:'Nama', type:'text', required:true},
        {key:'unit', label:'Unit Kerja', type:'select', required:true, options:()=>staticOpts(D.units)},
        {key:'type', label:'Tipe', type:'select', default:'Perorangan', options:()=>staticOpts(['Perorangan','Unit Kerja'])},
        {key:'nip', label:'NIP', type:'text'},
        {key:'phone', label:'Telepon', type:'text'},
        {key:'status', label:'Status', type:'select', default:'Aktif', options:()=>staticOpts(['Aktif','Nonaktif'])},
      ],
      build(v){ return { custodian_id: nextId(D.custodians,'custodian_id'), name:v.name, unit:v.unit, type:v.type||'Perorangan', status:v.status||'Aktif', nip:v.nip||'-', phone:v.phone||'-', asset_count:0 }; },
      successMsg:'Custodian baru berhasil ditambahkan.',
    },

    'jml': {
      title:'Catat Event JML', dataset:'jml_events',
      fields:[
        {key:'person', label:'Nama Personel', type:'text', required:true},
        {key:'event_type', label:'Jenis Event', type:'select', required:true, options:()=>staticOpts(['Joiner','Mover','Leaver'])},
        {key:'asset_id', label:'Aset Terkait', type:'select', options:()=>optsAssets()},
        {key:'status', label:'Status', type:'select', default:'Proses', options:()=>staticOpts(['Proses','Menunggu Pengembalian','Verifikasi Sanitasi','Clearance Selesai'])},
      ],
      build(v){ return { event_id: nextId(D.jml_events,'event_id'), person:v.person, event_type:v.event_type, asset_id:v.asset_id||'-', status:v.status||'Proses', event_date: todayStr() }; },
      successMsg:'Event JML berhasil dicatat.',
    },

    'maintenance': {
      title:'Buat Work Order', dataset:'work_orders',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'type', label:'Tipe', type:'select', default:'Preventive', options:()=>staticOpts(['Preventive','Corrective'])},
        {key:'priority', label:'Prioritas', type:'select', default:'Medium', options:()=>staticOpts(['Low','Medium','High','Urgent'])},
        {key:'technician', label:'Teknisi', type:'text'},
        {key:'vendor', label:'Vendor (opsional)', type:'text'},
        {key:'problem', label:'Deskripsi Masalah', type:'textarea', required:true, full:true},
        {key:'scheduled_date', label:'Tanggal Jadwal', type:'date', default:todayStr},
        {key:'cost', label:'Estimasi Biaya (Rp)', type:'number', default:0, min:0},
        {key:'downtime_hours', label:'Downtime (jam)', type:'number', default:0, min:0},
        {key:'status', label:'Status', type:'select', default:'Terjadwal', options:()=>staticOpts(['Terjadwal','Berjalan','Menunggu Suku Cadang','Selesai','Overdue'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { wo_id: nextId(D.work_orders,'wo_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', type:v.type||'Preventive', priority:v.priority||'Medium',
          technician:v.technician||'-', vendor:v.vendor||'-', problem:v.problem, scheduled_date:v.scheduled_date||todayStr(),
          completed_date: v.status==='Selesai'?todayStr():null, cost:parseInt(v.cost,10)||0, downtime_hours:parseInt(v.downtime_hours,10)||0, status:v.status||'Terjadwal' };
      },
      successMsg:'Work Order baru berhasil dibuat.',
    },

    'inspection': {
      title:'Catat Hasil Inspeksi', dataset:'inspections',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'inspector', label:'Inspector', type:'text', default:()=>CURRENT_USER.name},
        {key:'date', label:'Tanggal', type:'date', default:todayStr},
        {key:'physical_condition', label:'Kondisi Fisik (1–5)', type:'number', default:3, min:1, max:5},
        {key:'performance', label:'Performa (1–5)', type:'number', default:3, min:1, max:5},
        {key:'reliability', label:'Reliabilitas (1–5)', type:'number', default:3, min:1, max:5},
        {key:'safety', label:'Keselamatan (1–5)', type:'number', default:3, min:1, max:5},
        {key:'maintenance', label:'Maintenance (1–5)', type:'number', default:3, min:1, max:5},
        {key:'documentation', label:'Dokumentasi (1–5)', type:'number', default:3, min:1, max:5},
        {key:'finding', label:'Temuan', type:'textarea', full:true},
        {key:'recommendation', label:'Rekomendasi', type:'select', default:'Lanjutkan operasi', options:()=>staticOpts(['Lanjutkan operasi','Jadwalkan maintenance','Perlu perbaikan segera','Pertimbangkan replacement'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { inspection_id: nextId(D.inspections,'inspection_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', inspector:v.inspector||CURRENT_USER.name,
          date:v.date||todayStr(), physical_condition:+v.physical_condition||3, performance:+v.performance||3, reliability:+v.reliability||3,
          safety:+v.safety||3, maintenance:+v.maintenance||3, documentation:+v.documentation||3, finding:v.finding||'-', recommendation:v.recommendation||'Lanjutkan operasi' };
      },
      successMsg:'Hasil inspeksi berhasil dicatat.',
    },

    'risk': {
      title:'Tambah Risiko', dataset:'risks',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'event', label:'Peristiwa Risiko', type:'text', required:true},
        {key:'likelihood', label:'Likelihood (1–5)', type:'number', default:3, min:1, max:5},
        {key:'consequence', label:'Consequence (1–5)', type:'number', default:3, min:1, max:5},
        {key:'control', label:'Kontrol', type:'text'},
        {key:'residual', label:'Residual Risk', type:'select', default:'Medium', options:()=>staticOpts(['Low','Medium','High'])},
        {key:'owner', label:'Risk Owner', type:'text', default:()=>CURRENT_USER.name},
      ],
      build(v){
        const a = assetById(v.asset_id);
        const like=+v.likelihood||3, cons=+v.consequence||3, score=like*cons;
        const level = score>=16?'Critical':score>=10?'High':score>=5?'Medium':'Low';
        return { risk_id: nextId(D.risks,'risk_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', event:v.event, likelihood:like, consequence:cons, score, level, control:v.control||'-', residual:v.residual||'Medium', owner:v.owner||CURRENT_USER.name };
      },
      successMsg:'Risiko baru berhasil dicatat pada risk register.',
    },

    'performance': {
      title:'Tambah Data KPI Aset', dataset:'asset_kpis',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'availability', label:'Availability (%)', type:'number', default:90, min:0, max:100},
        {key:'utilization', label:'Utilization (%)', type:'number', default:60, min:0, max:100},
        {key:'mtbf_days', label:'MTBF (hari)', type:'number', default:120, min:0},
        {key:'mttr_hours', label:'MTTR (jam)', type:'number', default:8, min:0},
        {key:'ahi', label:'Asset Health Index', type:'number', default:70, min:0, max:100},
        {key:'decision', label:'Rekomendasi', type:'select', default:'MAINTAIN', options:()=>staticOpts(['KEEP','MAINTAIN','REFURBISH','REPLACE','DISPOSE'])},
        {key:'period', label:'Periode', type:'text', default:'Agustus 2026'},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { kpi_id: nextId(D.asset_kpis,'kpi_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', availability:+v.availability||90, mtbf_days:+v.mtbf_days||120, mttr_hours:+v.mttr_hours||8, utilization:+v.utilization||60, ahi:+v.ahi||70, decision:v.decision||'MAINTAIN', period:v.period||'Agustus 2026' };
      },
      successMsg:'Data KPI/AHI aset berhasil ditambahkan.',
    },

    'financial': {
      title:'Catat Biaya Aset', dataset:'costs',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'cost_type', label:'Jenis Biaya', type:'select', default:'Operation', options:()=>staticOpts(['Acquisition','Installation','Operation','Maintenance','Upgrade','Disposal'])},
        {key:'amount', label:'Nominal (Rp)', type:'number', required:true, min:0},
        {key:'period', label:'Periode', type:'select', default:'Q3 2026', options:()=>staticOpts(['Q1 2026','Q2 2026','Q3 2026'])},
        {key:'source', label:'Sumber Anggaran', type:'select', default:'APBN', options:()=>staticOpts(['APBN','Anggaran Unit','Hibah'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { cost_id: nextId(D.costs,'cost_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', cost_type:v.cost_type||'Operation', amount:parseInt(v.amount,10)||0, period:v.period||'Q3 2026', source:v.source||'APBN' };
      },
      successMsg:'Transaksi biaya berhasil dicatat.',
    },

    'sanitization': {
      title:'Catat Sanitasi Media', dataset:'sanitizations',
      fields:[
        {key:'asset_id', label:'Aset Terkait', type:'select', options:()=>optsAssets()},
        {key:'media', label:'Media', type:'text', required:true, placeholder:'mis. SSD 512GB'},
        {key:'method', label:'Metode', type:'select', default:'Clear (Overwrite)', options:()=>staticOpts(['Clear (Overwrite)','Purge (Degauss)','Purge (Crypto Erase)','Destroy (Shred)'])},
        {key:'operator', label:'Operator', type:'text', default:()=>CURRENT_USER.name},
        {key:'verification', label:'Verifikasi', type:'select', default:'Menunggu Verifikasi', options:()=>staticOpts(['Menunggu Verifikasi','Lulus Verifikasi'])},
        {key:'date', label:'Tanggal', type:'date', default:todayStr},
      ],
      build(v){
        return { sanitization_id: nextId(D.sanitizations,'sanitization_id'), asset_id:v.asset_id||'-', media:v.media, method:v.method||'Clear (Overwrite)', operator:v.operator||CURRENT_USER.name, verification:v.verification||'Menunggu Verifikasi', certificate_no:`CERT-SAN-2026-${String(D.sanitizations.length+1).padStart(3,'0')}`, date:v.date||todayStr(), nist_ref:'NIST SP 800-88 Rev.2' };
      },
      successMsg:'Catatan sanitasi media berhasil ditambahkan.',
    },

    'disposal': {
      title:'Ajukan Disposal', dataset:'disposals',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'reason', label:'Alasan', type:'text', required:true},
        {key:'assessment', label:'Hasil Assessment', type:'text'},
        {key:'method', label:'Metode', type:'select', default:'Lelang', options:()=>staticOpts(['Lelang','Hibah','Pemusnahan'])},
        {key:'approval', label:'Status Persetujuan', type:'select', default:'Menunggu Persetujuan', options:()=>staticOpts(['Menunggu Persetujuan','Dalam Kajian','Disetujui'])},
        {key:'evidence', label:'Evidence', type:'text', placeholder:'mis. BA Pemeriksaan'},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { disposal_id: nextId(D.disposals,'disposal_id'), asset_id:v.asset_id, asset_name:a?a.name:'-', reason:v.reason, assessment:v.assessment||'-', approval:v.approval||'Menunggu Persetujuan', method:v.method||'Lelang', evidence:v.evidence||'-', date: todayStr() };
      },
      successMsg:'Pengajuan disposal berhasil dibuat.',
    },

    'audit': {
      title:'Catat Temuan Audit', dataset:'audits',
      fields:[
        {key:'scope', label:'Ruang Lingkup', type:'select', options:()=>staticOpts(['Register & Sensus','Maintenance & WO','Cyber Asset Security','Disposal & Sanitization','Governance & Dokumentasi'])},
        {key:'finding', label:'Temuan', type:'textarea', required:true, full:true},
        {key:'severity', label:'Severity', type:'select', default:'Minor', options:()=>staticOpts(['Observation','Minor','Major'])},
        {key:'root_cause', label:'Root Cause', type:'text'},
        {key:'corrective_action', label:'Corrective Action', type:'text'},
        {key:'pic', label:'PIC', type:'text', default:()=>CURRENT_USER.name},
        {key:'due_date', label:'Jatuh Tempo', type:'date', default:todayStr},
        {key:'status', label:'Status', type:'select', default:'Open', options:()=>staticOpts(['Open','Verifikasi','Closed'])},
      ],
      build(v){
        return { audit_id: nextId(D.audits,'audit_id'), scope:v.scope||'-', finding:v.finding, severity:v.severity||'Minor', root_cause:v.root_cause||'-', corrective_action:v.corrective_action||'-', pic:v.pic||CURRENT_USER.name, due_date:v.due_date||todayStr(), status:v.status||'Open', repeat_finding:false };
      },
      successMsg:'Temuan audit berhasil dicatat.',
    },

    'documents': {
      title:'Unggah Dokumen', dataset:'documents',
      fields:[
        {key:'asset_id', label:'Terkait Aset', type:'select', options:()=>optsAssets()},
        {key:'type', label:'Jenis Dokumen', type:'select', required:true, options:()=>staticOpts(['BAST','Kontrak','Warranty','Manual','Sertifikat Kalibrasi','Sertifikat Sanitasi','Laporan Inspeksi','Laporan Maintenance'])},
        {key:'version', label:'Versi', type:'text', default:'v1.0'},
        {key:'uploaded_by', label:'Diunggah oleh', type:'text', default:()=>CURRENT_USER.name},
        {key:'expiry', label:'Kedaluwarsa (opsional)', type:'date'},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { document_id: nextId(D.documents,'document_id'), asset_id:v.asset_id||'-', asset_name:a?a.name:'-', type:v.type, version:v.version||'v1.0', uploaded_by:v.uploaded_by||CURRENT_USER.name, uploaded_at: todayStr(), expiry:v.expiry||null };
      },
      successMsg:'Dokumen berhasil diunggah (simulasi — file tidak benar-benar disimpan).',
    },

    'sensus-plan': {
      title:'Buat Rencana Sensus', dataset:'sensus_plans',
      fields:[
        {key:'area', label:'Area', type:'select', required:true, options:optsBuildingNames},
        {key:'petugas', label:'Petugas', type:'text', default:()=>CURRENT_USER.name},
        {key:'start_date', label:'Tanggal Mulai', type:'date', default:todayStr},
        {key:'target_count', label:'Target Aset', type:'number', default:20, min:1},
        {key:'status', label:'Status', type:'select', default:'Direncanakan', options:()=>staticOpts(['Direncanakan','Berjalan','Selesai'])},
      ],
      build(v){
        return { sensus_id: nextId(D.sensus_plans,'sensus_id'), area:v.area, petugas:v.petugas||CURRENT_USER.name, start_date:v.start_date||todayStr(), status:v.status||'Direncanakan', target_count:+v.target_count||20, scanned_count:0, anomaly_count:0 };
      },
      successMsg:'Rencana sensus baru berhasil dibuat.',
    },

    'recon-batch': {
      title:'Tambah Batch Rekonsiliasi', dataset:'recon_batches',
      fields:[
        {key:'period', label:'Periode', type:'text', required:true, placeholder:'mis. Triwulan 4 2026'},
        {key:'source', label:'Sumber', type:'text', default:'SAKTI/SIMAN Export'},
        {key:'file', label:'Nama File Sumber', type:'text', placeholder:'mis. export_triwulan_4_2026.xlsx'},
        {key:'status', label:'Status', type:'select', default:'Berjalan', options:()=>staticOpts(['Berjalan','Menunggu Verifikasi','Signed-off'])},
      ],
      build(v){
        const batchId = nextId(D.recon_batches,'batch_id');
        const sample = [...D.assets].sort(()=>Math.random()-0.5).slice(0, Math.min(10, D.assets.length));
        let matched = 0;
        sample.forEach(a=>{
          const isMatch = Math.random() > 0.25;
          if(isMatch) matched++;
          saveUserRecord('recon_items', {
            item_id: nextId(D.recon_items,'item_id'), batch_id: batchId, bmn_uid:a.bmn_uid, asset_name:a.name,
            match_status: isMatch ? 'Matched' : ['Unmatched','Mismatch','Duplicate','Missing'][Math.floor(Math.random()*4)],
            exception_note: isMatch ? null : 'Perlu verifikasi lanjutan',
          });
        });
        return { batch_id:batchId, period:v.period, source:v.source||'SAKTI/SIMAN Export', file:v.file||`export_${batchId}.xlsx`, status:v.status||'Berjalan', total_items:sample.length, matched, exception: sample.length-matched };
      },
      successMsg:'Batch rekonsiliasi baru berhasil dibuat beserta item simulasinya.',
    },

    'cyber-asset': {
      title:'Tambah Aset Siber', dataset:'cyber_assets',
      fields:[
        {key:'asset_id', label:'Aset', type:'select', required:true, options:()=>optsAssets()},
        {key:'classification', label:'Klasifikasi', type:'select', default:'Rahasia', options:()=>staticOpts(['Terbatas','Rahasia','Sangat Rahasia'])},
        {key:'custodian', label:'Custodian', type:'text', default:()=>CURRENT_USER.name},
        {key:'authorization', label:'Otorisasi', type:'select', default:'Kepala Unit Keamanan Informasi', options:()=>staticOpts(['Kepala Unit Keamanan Informasi','Direktur','Ka. Lab Kripto'])},
      ],
      build(v){
        const a = assetById(v.asset_id);
        return { cyber_asset_id: nextId(D.cyber_assets,'cyber_asset_id'), asset_id:v.asset_id, name:a?a.name:'-', classification:v.classification||'Rahasia', custodian:v.custodian||CURRENT_USER.name, authorization:v.authorization||'Kepala Unit Keamanan Informasi', last_access: todayStr(), access_count_30d:0, movement_monitoring:'Aktif' };
      },
      successMsg:'Aset siber baru berhasil didaftarkan.',
    },

    'master-location': {
      title:'Tambah Titik Lokasi', dataset:'locations',
      fields:[
        {key:'building', label:'Gedung', type:'select', required:true, options:optsBuildingNames},
        {key:'floor', label:'Lantai', type:'text', default:'Lantai 1'},
        {key:'room', label:'Ruang/Lab', type:'text', required:true, placeholder:'mis. R-05'},
      ],
      build(v){
        const b = D.buildings.find(x=>x.name===v.building);
        return { location_id: nextId(D.locations,'location_id'), site:'Kampus Utama Ciseeng', building:v.building, building_id:b?b.id:'-', floor:v.floor||'Lantai 1', room:v.room, label:`${v.building} / ${v.floor||'Lantai 1'} / ${v.room}` };
      },
      successMsg:'Titik lokasi baru berhasil ditambahkan.',
    },

    'governance-improvement': {
      title:'Tambah Continual Improvement', dataset:'governance.improvement',
      fields:[
        {key:'title', label:'Judul Improvement', type:'text', required:true},
        {key:'linked', label:'Terhubung dengan', type:'text', placeholder:'mis. KPI Sensus / Risk RISK-2026-003'},
        {key:'status', label:'Status', type:'select', default:'Direncanakan', options:()=>staticOpts(['Direncanakan','Berjalan','Selesai'])},
      ],
      build(v){
        return { id:'CI-'+String(D.governance.improvement.length+1).padStart(3,'0'), title:v.title, linked:v.linked||'-', status:v.status||'Direncanakan' };
      },
      successMsg:'Improvement register berhasil diperbarui.',
    },
  };

  function renderFormField(f){
    const req = f.required ? '<span class="req"> *</span>' : '';
    const defVal = typeof f.default === 'function' ? f.default() : (f.default!=null ? f.default : '');
    let control = '';
    if(f.type==='select'){
      const opts = typeof f.options==='function' ? f.options() : (f.options||[]);
      control = `<select class="input" data-field="${f.key}">
        ${!f.required?'<option value="">— Tidak diisi —</option>':''}
        ${opts.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(defVal)?'selected':''}>${esc(o.label)}</option>`).join('')}
      </select>`;
    } else if(f.type==='textarea'){
      control = `<textarea class="input" rows="3" data-field="${f.key}" placeholder="${esc(f.placeholder||'')}">${esc(defVal)}</textarea>`;
    } else {
      const type = f.type || 'text';
      control = `<input class="input" type="${type}" data-field="${f.key}" value="${esc(defVal)}" placeholder="${esc(f.placeholder||'')}"
        ${f.min!=null?`min="${f.min}"`:''} ${f.max!=null?`max="${f.max}"`:''} ${f.step!=null?`step="${f.step}"`:''}>`;
    }
    return `<div class="field ${f.full?'field-full':''}" data-field-wrap="${f.key}">
      <label>${esc(f.label)}${req}</label>
      ${control}
      <div class="field-error">Kolom ini wajib diisi.</div>
    </div>`;
  }
  function readFormField(root, f){
    const el = root.querySelector(`[data-field="${f.key}"]`);
    return el ? el.value : '';
  }

  function openAddForm(kind){
    const cfg = FORM_CONFIGS[kind];
    if(!cfg){ toast('Form tambah data untuk modul ini belum tersedia pada purwarupa.'); return; }
    const fieldsHtml = cfg.fields.map(renderFormField).join('');
    openDrawer(`
      <div class="drawer-head">
        <div><h2>${esc(cfg.title)}</h2><div class="meta">Data tersimpan pada sesi/browser ini (localStorage) — bukan basis data produksi</div></div>
        <button class="drawer-close">${icon('x')}</button>
      </div>
      <div class="drawer-body">
        <form id="add-form" onsubmit="return false"><div class="form-grid">${fieldsHtml}</div></form>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-outline btn-sm" id="add-cancel">Batal</button>
        <button class="btn btn-primary btn-sm" id="add-submit">${icon('checkCircle')}Simpan</button>
      </div>
    `);
    const root = qs('#drawer-root');
    qs('#add-cancel').addEventListener('click', closeDrawer);
    qs('#add-submit').addEventListener('click', ()=>{
      let ok = true;
      const values = {};
      cfg.fields.forEach(f=>{
        const val = readFormField(root, f);
        values[f.key] = val;
        const wrap = root.querySelector(`[data-field-wrap="${f.key}"]`);
        const isEmpty = String(val).trim()==='';
        if(f.required && isEmpty){ wrap.classList.add('has-error'); ok=false; }
        else wrap.classList.remove('has-error');
      });
      if(!ok){ toast('Mohon lengkapi kolom bertanda (*).'); return; }
      const record = cfg.build(values);
      saveUserRecord(cfg.dataset, record);
      if(cfg.afterAdd) cfg.afterAdd(record);
      closeDrawer();
      toast(cfg.successMsg || 'Data baru berhasil ditambahkan.');
      if(cfg.onDone) cfg.onDone(record); else route();
    });
  }

  // ---- CSV export (real client-side download) --------------------------------
  function exportCSV(filename, columns, rows){
    if(!rows.length){ toast('Tidak ada data pada tampilan saat ini untuk diekspor.'); return; }
    const esc2 = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
    const header = columns.map(c=>esc2(c.label)).join(',');
    const lines = rows.map(r => columns.map(c=>esc2(c.render ? c.render(r) : r[c.key])).join(','));
    const csv = '﻿' + [header, ...lines].join('\r\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
    toast(`Berkas ${filename} diunduh (${rows.length} baris).`);
  }

  const DETAIL_FIELDS = {
    'qr-tag': ['tag_id','asset_id','bmn_uid','qr_payload','material','print_batch','printed_at','status'],
    'mutasi': ['request_id','asset_id','asset_name','change_type','reason','old_location','new_location','old_custodian','new_custodian','requestor','approver','request_date','status'],
    'custodian': ['custodian_id','name','unit','type','nip','phone','asset_count','status'],
    'jml': ['event_id','person','event_type','asset_id','event_date','status'],
    'maintenance': ['wo_id','asset_id','asset_name','type','priority','technician','vendor','problem','scheduled_date','completed_date','downtime_hours','cost','status'],
    'inspection': ['inspection_id','asset_id','asset_name','inspector','date','finding','recommendation'],
    'risk': ['risk_id','asset_id','asset_name','event','likelihood','consequence','score','level','control','residual','owner'],
    'performance': ['kpi_id','asset_id','asset_name','availability','mtbf_days','mttr_hours','utilization','ahi','decision','period'],
    'financial': ['cost_id','asset_id','asset_name','cost_type','amount','period','source'],
    'sanitization': ['sanitization_id','asset_id','media','method','operator','date','verification','certificate_no','nist_ref'],
    'disposal': ['disposal_id','asset_id','asset_name','reason','assessment','method','approval','evidence','date'],
    'audit': ['audit_id','scope','finding','severity','root_cause','corrective_action','pic','due_date','status','repeat_finding'],
    'documents': ['document_id','asset_id','asset_name','type','version','uploaded_by','uploaded_at','expiry'],
    'reporting': ['report_id','name','category','period','unit'],
  };

  function openGenericDetail(config, row, extraHtml){
    const fields = DETAIL_FIELDS[Object.keys(MODULES).find(k=>MODULES[k]===config)] || Object.keys(row);
    const moduleId = Object.keys(MODULES).find(k=>MODULES[k]===config);
    let scoreSection = '';
    if(moduleId==='inspection'){
      const params = [['physical_condition','Kondisi Fisik'],['performance','Performa'],['reliability','Reliabilitas'],['safety','Keselamatan'],['maintenance','Maintenance'],['documentation','Dokumentasi']];
      scoreSection = `<div class="section-title">Skor Penilaian (1–5)</div><div class="def-grid">` + params.map(([k,l])=>`
        <div class="def-item"><span class="k">${l}</span>
          <div class="score-dots" style="margin-top:4px">${[1,2,3,4,5].map(i=>`<i class="${i<=row[k]?'on':''}"></i>`).join('')}</div>
        </div>`).join('') + `</div>`;
    }
    if(moduleId==='performance'){
      const bars = [['availability','Availability','blue'],['utilization','Utilization','violet'],['ahi','Asset Health Index','green']];
      scoreSection = `<div class="section-title">Indikator Kinerja</div>` + bars.map(([k,l,c])=>`
        <div style="margin-bottom:12px">
          <div class="flex items-center" style="justify-content:space-between;margin-bottom:5px;font-size:12.5px">
            <span class="text-muted">${l}</span><b>${row[k]}${k!=='ahi'?'%':''}</b>
          </div>
          <div class="progress"><i style="width:${Math.min(100,row[k])}%;background:var(--${c==='blue'?'blue-500':c==='violet'?'violet-600':'green-600'})"></i></div>
        </div>`).join('');
    }
    if(moduleId==='risk'){
      scoreSection = `<div class="section-title">Matriks Risiko</div>
        <div class="flex items-center gap-12">
          <div class="def-item"><span class="k">Likelihood</span><span class="v">${row.likelihood}/5</span></div>
          <div style="font-size:20px;color:var(--text-400)">×</div>
          <div class="def-item"><span class="k">Consequence</span><span class="v">${row.consequence}/5</span></div>
          <div style="font-size:20px;color:var(--text-400)">=</div>
          <div class="def-item"><span class="k">Skor</span><span class="v">${row.score}</span></div>
        </div>`;
    }
    const titleText = row.name || row.asset_name || row.person || row.media || row.event || row[config.idKey];
    openDrawer(`
      <div class="drawer-head">
        <div>
          <h2>${esc(titleText)}</h2>
          <div class="meta">${esc(config.title)} · ${esc(row[config.idKey])}</div>
        </div>
        <button class="drawer-close">${icon('x')}</button>
      </div>
      <div class="drawer-body">
        <div class="section-title">Informasi Umum</div>
        ${defGrid(row, fields)}
        ${scoreSection}
        ${extraHtml || ''}
      </div>
      <div class="drawer-foot">
        <button class="btn btn-outline btn-sm" id="drawer-print">${icon('printer')}Cetak</button>
        <button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button>
      </div>
    `);
    qs('#drawer-print').addEventListener('click', ()=> toast('Simulasi cetak dokumen.'));
    qs('#drawer-close2').addEventListener('click', closeDrawer);
  }

  // ---- Asset detail (BMN Register) — rich tabbed drawer ----------------------
  function openAssetDetail(assetId){
    const a = D.assets.find(x=>x.asset_id===assetId);
    if(!a) return;
    const wos = D.work_orders.filter(w=>w.asset_id===assetId);
    const risks = D.risks.filter(r=>r.asset_id===assetId);
    const docs = D.documents.filter(d=>d.asset_id===assetId);
    const inspections = D.inspections.filter(i=>i.asset_id===assetId);
    const kpi = D.asset_kpis.find(k=>k.asset_id===assetId);

    const tabs = [
      {id:'ringkasan', label:'Ringkasan'},
      {id:'lokasi', label:'Lokasi & Custodian'},
      {id:'riwayat', label:`Riwayat (${wos.length+inspections.length})`},
      {id:'risiko', label:`Risiko (${risks.length})`},
      {id:'dokumen', label:`Dokumen (${docs.length})`},
    ];

    function tabBody(id){
      if(id==='ringkasan'){
        return `
          <div class="section-title">Identitas BMN</div>
          ${defGrid(a, ['asset_id','bmn_uid','satker','kode_barang','nup','tag_id'])}
          <div class="section-title">Spesifikasi</div>
          ${defGrid(a, ['name','category','brand','model','serial','year','value','warranty_until'])}
          <div class="section-title">Status & Kondisi</div>
          ${defGrid(a, ['condition_label','criticality','risk_level','status'])}
          ${kpi ? `<div class="section-title">Asset Health Index</div>
            <div class="flex items-center gap-12">
              <div class="def-item"><span class="k">AHI</span><span class="v">${kpi.ahi}</span></div>
              <div class="def-item"><span class="k">Availability</span><span class="v">${kpi.availability}%</span></div>
              <div class="def-item"><span class="k">Utilization</span><span class="v">${kpi.utilization}%</span></div>
              <div class="def-item"><span class="k">Rekomendasi</span><span class="v">${badgeHtml(kpi.decision, ({KEEP:'b-green',MAINTAIN:'b-blue',REFURBISH:'b-amber',REPLACE:'b-red',DISPOSE:'b-red'}[kpi.decision]))}</span></div>
            </div>` : ''}
        `;
      }
      if(id==='lokasi'){
        return `
          <div class="section-title">Lokasi</div>
          ${defGrid(a, ['location_label'])}
          <div class="section-title">Custodian</div>
          ${defGrid(a, ['custodian_name','unit'])}
          <div class="module-hint">${icon('info')}<span>Perubahan lokasi/custodian harus melalui modul Mutasi/IMACD dan disertai evidence (scan/foto) sebelum tercatat sebagai histori resmi.</span></div>
        `;
      }
      if(id==='riwayat'){
        let rows = '';
        wos.forEach(w=> rows += `<div class="timeline-item"><div class="timeline-dot"></div><div><div class="t-title">Work Order — ${esc(w.problem)}</div><div class="t-meta">${esc(w.type)} · ${esc(w.technician)} · ${fmtDate(w.scheduled_date)} · ${badgeHtml(w.status, badgeClassFor('status',w.status))}</div></div></div>`);
        inspections.forEach(i=> rows += `<div class="timeline-item"><div class="timeline-dot" style="background:var(--gold-500);box-shadow:0 0 0 3px var(--gold-100)"></div><div><div class="t-title">Inspeksi — ${esc(i.finding)}</div><div class="t-meta">${esc(i.inspector)} · ${fmtDate(i.date)} · Skor fisik ${i.physical_condition}/5</div></div></div>`);
        if(!rows) rows = `<div class="table-empty">${icon('search')}<div>Belum ada riwayat tercatat untuk aset ini.</div></div>`;
        return `<div class="section-title">Riwayat Maintenance &amp; Inspeksi</div><div class="timeline">${rows}</div>`;
      }
      if(id==='risiko'){
        if(!risks.length) return `<div class="table-empty">${icon('shield')}<div>Tidak ada risiko terdaftar untuk aset ini.</div></div>`;
        return `<div class="section-title">Risk Register Terkait</div>` + risks.map(r=>`
          <div class="panel" style="margin-bottom:10px">
            <div class="panel-body">
              <div class="flex items-center" style="justify-content:space-between">
                <b style="font-size:13px">${esc(r.event)}</b>
                ${badgeHtml(r.level, levelBadge(r.level))}
              </div>
              <div class="text-muted" style="font-size:12.5px;margin-top:6px">Kontrol: ${esc(r.control)} · Owner: ${esc(r.owner)} · Skor: ${r.score}</div>
            </div>
          </div>`).join('');
      }
      if(id==='dokumen'){
        if(!docs.length) return `<div class="table-empty">${icon('folder')}<div>Belum ada dokumen terlampir.</div></div>`;
        return `<div class="section-title">Dokumen Terkait</div><div class="thumb-row">` + docs.map(d=>`
          <div style="width:120px;text-align:center">
            <div class="thumb">${icon('fileCheck')}</div>
            <div style="font-size:11px;margin-top:6px;color:var(--text-700);font-weight:600">${esc(d.type)}</div>
            <div style="font-size:10.5px;color:var(--text-500)">${esc(d.version)}</div>
          </div>`).join('') + `</div>`;
      }
      return '';
    }

    let currentTab = 'ringkasan';
    openDrawer(`
      <div class="drawer-head">
        <div>
          <h2>${esc(a.name)}</h2>
          <div class="meta">${esc(a.asset_id)} · ${esc(a.bmn_uid)}</div>
        </div>
        <button class="drawer-close">${icon('x')}</button>
      </div>
      <div class="drawer-tabs" id="asset-tabs">
        ${tabs.map(t=>`<div class="drawer-tab ${t.id===currentTab?'active':''}" data-tab="${t.id}">${esc(t.label)}</div>`).join('')}
      </div>
      <div class="drawer-body" id="asset-tab-body">${tabBody(currentTab)}</div>
      <div class="drawer-foot">
        <button class="btn btn-outline btn-sm" id="drawer-print">${icon('printer')}Cetak BAST</button>
        <button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button>
      </div>
    `);
    qs('#asset-tabs').querySelectorAll('.drawer-tab').forEach(t=>{
      t.addEventListener('click', ()=>{
        qs('#asset-tabs').querySelectorAll('.drawer-tab').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        qs('#asset-tab-body').innerHTML = tabBody(t.dataset.tab);
      });
    });
    qs('#drawer-print').addEventListener('click', ()=> toast('Simulasi cetak Berita Acara Serah Terima (BAST).'));
    qs('#drawer-close2').addEventListener('click', closeDrawer);
  }

  // ---- QR/Barcode & Asset Tag detail (real QR + barcode rendering) -----------
  function openTagDetail(tag){
    const asset = D.assets.find(a=>a.asset_id===tag.asset_id);
    openDrawer(`
      <div class="drawer-head">
        <div><h2>${esc(asset ? asset.name : tag.tag_id)}</h2><div class="meta">${esc(tag.tag_id)} · ${esc(tag.asset_id)}</div></div>
        <button class="drawer-close">${icon('x')}</button>
      </div>
      <div class="drawer-body">
        <div class="section-title">Label Tag (QR &amp; Barcode Aktual)</div>
        ${tagLabelCardHtml(tag, asset)}
        <div class="module-hint" style="margin-top:16px">${icon('info')}<span>QR code memetakan ke payload <code>${esc(tag.qr_payload)}</code> dan barcode Code128 memuat Tag ID — keduanya digenerate langsung di browser (tidak memerlukan layanan eksternal). Label cetak tidak memuat informasi sensitif, hanya logo, NUP dan nama barang sesuai ketentuan.</span></div>
        <div class="section-title">Informasi Tag</div>
        ${defGrid(tag, ['tag_id','asset_id','bmn_uid','qr_payload','material','print_batch','printed_at','status'])}
      </div>
      <div class="drawer-foot">
        <button class="btn btn-outline btn-sm" id="tag-print">${icon('printer')}Cetak Label</button>
        <button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button>
      </div>
    `);
    qs('#tag-print').addEventListener('click', ()=> openTagPrintView(tag, asset));
    qs('#drawer-close2').addEventListener('click', closeDrawer);
  }

  // ---- Report viewer -----------------------------------------------------------
  function rTable(cols, rows){
    if(!rows.length) return `<div class="table-empty" style="padding:20px">${icon('search')}<div>Tidak ada data untuk kategori ini.</div></div>`;
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr>${cols.map(c=>{
        const val = c.render ? c.render(r) : r[c.key];
        return c.badge ? `<td>${badgeHtml(val, c.badge(r))}</td>` : `<td>${esc(val==null?'-':val)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }
  const REPORT_VIEWS = {
    'RPT-001': () => {
      const rows = D.assets.slice(0, 25);
      return `
        ${kpiCardsHtml([
          {label:'Total Aset', value:D.assets.length, icon:'box', tint:'blue'},
          {label:'Kondisi Baik ke Atas', value:D.assets.filter(a=>a.condition_score>=4).length, icon:'checkCircle', tint:'green'},
          {label:'Aset Kritis', value:D.assets.filter(a=>a.criticality==='Critical').length, icon:'alertTriangle', tint:'red'},
        ])}
        <div class="report-section-title">Daftar Aset (menampilkan ${rows.length} dari ${D.assets.length})</div>
        ${rTable([
          {key:'asset_id', label:'Asset ID'}, {key:'name', label:'Nama'}, {key:'category', label:'Kategori'},
          {key:'location_label', label:'Lokasi'}, {key:'condition_label', label:'Kondisi'},
          {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
        ], rows)}
        <p class="cell-muted" style="margin-top:10px;font-size:11.5px">Laporan lengkap (${D.assets.length} baris) tersedia melalui tombol Ekspor CSV pada halaman BMN Register.</p>`;
    },
    'RPT-002': () => {
      const plans = D.sensus_plans;
      const totalAnomaly = D.sensus_items.filter(s=>s.result==='Anomali').length;
      return `
        ${kpiCardsHtml([
          {label:'Rencana Sensus', value:plans.length, icon:'clipcheck', tint:'blue'},
          {label:'Total Aset Discan', value:plans.reduce((a,p)=>a+p.scanned_count,0), icon:'checkCircle', tint:'green'},
          {label:'Anomali Ditemukan', value:totalAnomaly, icon:'alertTriangle', tint:'red'},
        ])}
        <div class="report-section-title">Ringkasan per Rencana Sensus</div>
        ${rTable([
          {key:'sensus_id', label:'ID'}, {key:'area', label:'Area'}, {key:'petugas', label:'Petugas'},
          {key:'scanned_count', label:'Discan', render:r=>`${r.scanned_count}/${r.target_count}`},
          {key:'anomaly_count', label:'Anomali'},
          {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
        ], plans)}`;
    },
    'RPT-003': () => {
      const batches = D.recon_batches;
      return `
        ${kpiCardsHtml([
          {label:'Batch', value:batches.length, icon:'refresh', tint:'blue'},
          {label:'Matched', value:batches.reduce((a,b)=>a+b.matched,0), icon:'checkCircle', tint:'green'},
          {label:'Exception', value:batches.reduce((a,b)=>a+b.exception,0), icon:'alertTriangle', tint:'red'},
        ])}
        <div class="report-section-title">Ringkasan Batch Rekonsiliasi</div>
        ${rTable([
          {key:'batch_id', label:'ID Batch'}, {key:'period', label:'Periode'}, {key:'total_items', label:'Total Item'},
          {key:'matched', label:'Matched'}, {key:'exception', label:'Exception'},
          {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
        ], batches)}`;
    },
    'RPT-004': () => {
      const pm = D.work_orders.filter(w=>w.type==='Preventive');
      const done = pm.filter(w=>w.status==='Selesai').length;
      return `
        ${kpiCardsHtml([
          {label:'Total PM', value:pm.length, icon:'wrench', tint:'blue'},
          {label:'PM Compliance', value: pm.length?Math.round(100*done/pm.length)+'%':'-', icon:'checkCircle', tint:'green'},
          {label:'Overdue', value:pm.filter(w=>w.status==='Overdue').length, icon:'alertTriangle', tint:'red'},
        ])}
        <div class="report-section-title">Daftar Preventive Maintenance</div>
        ${rTable([
          {key:'wo_id', label:'WO ID'}, {key:'asset_name', label:'Aset'}, {key:'technician', label:'Teknisi'},
          {key:'scheduled_date', label:'Jadwal', render:r=>fmtDate(r.scheduled_date)},
          {key:'status', label:'Status', badge:r=>badgeClassFor('status', r.status)},
        ], pm)}`;
    },
    'RPT-005': () => {
      const risks = D.risks;
      return `
        ${kpiCardsHtml([
          {label:'Total Risiko', value:risks.length, icon:'alertTriangle', tint:'blue'},
          {label:'Critical', value:risks.filter(r=>r.level==='Critical').length, icon:'alertCircle', tint:'red'},
          {label:'High', value:risks.filter(r=>r.level==='High').length, icon:'alertTriangle', tint:'amber'},
        ])}
        <div class="report-section-title">Risk Register</div>
        ${rTable([
          {key:'risk_id', label:'ID'}, {key:'asset_name', label:'Aset'}, {key:'event', label:'Peristiwa'},
          {key:'score', label:'Skor'}, {key:'level', label:'Level', badge:r=>levelBadge(r.level)}, {key:'owner', label:'Owner'},
        ], risks)}`;
    },
    'RPT-006': () => {
      const byType = {};
      D.costs.forEach(c=> byType[c.cost_type]=(byType[c.cost_type]||0)+c.amount);
      return `
        ${kpiCardsHtml([
          {label:'Total Biaya Lifecycle', value:fmtIDR(D.costs.reduce((a,c)=>a+c.amount,0)), icon:'dollar', tint:'blue'},
          {label:'Jumlah Transaksi', value:D.costs.length, icon:'barChart', tint:'violet'},
        ])}
        <div class="report-section-title">Rekap Biaya per Jenis</div>
        ${rTable([{key:'type', label:'Jenis Biaya'}, {key:'total', label:'Total', render:r=>fmtIDR(r.total)}], Object.entries(byType).map(([type,total])=>({type,total})))}
        <div class="report-section-title">Transaksi Terbesar (Top 15)</div>
        ${rTable([
          {key:'cost_id', label:'ID'}, {key:'asset_name', label:'Aset'}, {key:'cost_type', label:'Jenis'},
          {key:'amount', label:'Nominal', render:r=>fmtIDR(r.amount)}, {key:'period', label:'Periode'},
        ], [...D.costs].sort((a,b)=>b.amount-a.amount).slice(0,15))}`;
    },
    'RPT-007': () => `
        ${kpiCardsHtml([
          {label:'Pengajuan Disposal', value:D.disposals.length, icon:'trash', tint:'blue'},
          {label:'Disetujui', value:D.disposals.filter(d=>d.approval==='Disetujui').length, icon:'checkCircle', tint:'green'},
          {label:'Sanitasi Terverifikasi', value:D.sanitizations.filter(s=>s.verification==='Lulus Verifikasi').length, icon:'shield', tint:'violet'},
        ])}
        <div class="report-section-title">Daftar Disposal</div>
        ${rTable([
          {key:'disposal_id', label:'ID'}, {key:'asset_name', label:'Aset'}, {key:'method', label:'Metode'},
          {key:'approval', label:'Persetujuan', badge:r=>badgeClassFor('appr', r.approval)},
        ], D.disposals)}
        <div class="report-section-title">Daftar Sanitasi Media</div>
        ${rTable([
          {key:'sanitization_id', label:'ID'}, {key:'media', label:'Media'}, {key:'method', label:'Metode'},
          {key:'verification', label:'Verifikasi', badge:r=>badgeClassFor('ver', r.verification)},
        ], D.sanitizations)}`,
    'RPT-008': () => {
      const avgAHI = (D.asset_kpis.reduce((a,r)=>a+r.ahi,0)/D.asset_kpis.length).toFixed(1);
      const byDecision = {KEEP:0,MAINTAIN:0,REFURBISH:0,REPLACE:0,DISPOSE:0};
      D.asset_kpis.forEach(k=> byDecision[k.decision]++);
      return `
        ${kpiCardsHtml([
          {label:'Total Aset', value:D.assets.length, icon:'box', tint:'blue'},
          {label:'Rata-rata AHI', value:avgAHI, icon:'activity', tint:'green'},
          {label:'Aset Kritis', value:D.assets.filter(a=>a.criticality==='Critical').length, icon:'alertTriangle', tint:'red'},
          {label:'Risiko High/Critical', value:D.risks.filter(r=>r.level==='Critical'||r.level==='High').length, icon:'shield', tint:'amber'},
        ])}
        <div class="report-section-title">Rekomendasi Lifecycle Decision</div>
        ${rTable([{key:'decision', label:'Keputusan'}, {key:'count', label:'Jumlah Aset'}], Object.entries(byDecision).map(([decision,count])=>({decision,count})))}`;
    },
  };
  function openReportViewer(reportRow){
    const root = document.createElement('div');
    root.className = 'report-overlay';
    const body = (REPORT_VIEWS[reportRow.report_id] || (()=>`<p>Pratinjau untuk laporan ini belum tersedia pada purwarupa.</p>`))();
    root.innerHTML = `
      <div class="report-toolbar">
        <div class="rt-title">${icon('barChart')} Pratinjau Laporan</div>
        <div class="rt-actions">
          <button class="btn btn-outline btn-sm" id="rv-print" style="background:#fff">${icon('printer')}Cetak / Unduh PDF</button>
          <button class="btn btn-outline btn-sm" id="rv-close" style="background:#fff">${icon('x')}Tutup</button>
        </div>
      </div>
      <div class="report-paper">
        <div class="report-letterhead">
          <div class="rl-logo">${icon('shield')}</div>
          <div>
            <div class="rl-org">${esc(D.org)}</div>
            <div class="rl-title">${esc(reportRow.name)}</div>
          </div>
        </div>
        <div class="report-meta-row">
          <div><span class="rm-k">Kategori</span><span class="rm-v">${esc(reportRow.category)}</span></div>
          <div><span class="rm-k">Periode</span><span class="rm-v">${esc(reportRow.period)}</span></div>
          <div><span class="rm-k">Unit</span><span class="rm-v">${esc(reportRow.unit)}</span></div>
          <div><span class="rm-k">ID Laporan</span><span class="rm-v">${esc(reportRow.report_id)}</span></div>
        </div>
        ${body}
        <div class="report-footnote">
          <span>Dibuat oleh ${esc(CURRENT_USER.name)} (${esc(CURRENT_USER.role)}) — SIMASET BMN</span>
          <span>Dicetak ${fmtDate(todayStr())} · Data simulasi</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#rv-print').addEventListener('click', ()=> window.print());
    root.querySelector('#rv-close').addEventListener('click', ()=> root.remove());
    root.addEventListener('click', e=>{ if(e.target===root) root.remove(); });
  }

  // ---- Chart helpers ---------------------------------------------------------
  const CHART_PALETTE = ['#2563eb','#c8942c','#16a34a','#dc2626','#7c3aed','#0891b2','#64748b','#d97706'];
  function makeChart(ctx, cfg){ const c = new Chart(ctx, cfg); activeCharts.push(c); return c; }

  // =============================================================================
  // PAGE RENDERERS — custom pages
  // =============================================================================

  function renderDashboard(){
    const assets = D.assets;
    const totalAssets = assets.length;
    const avgAHI = (D.asset_kpis.reduce((a,r)=>a+r.ahi,0)/D.asset_kpis.length).toFixed(1);
    const criticalAssets = assets.filter(a=>a.criticality==='Critical').length;
    const openRisks = D.risks.filter(r=>r.level==='Critical'||r.level==='High').length;
    const anomalyCount = D.sensus_items.filter(s=>s.result==='Anomali').length;
    const pmDone = D.work_orders.filter(w=>w.type==='Preventive'&&w.status==='Selesai').length;
    const pmTotal = D.work_orders.filter(w=>w.type==='Preventive').length;
    const pmCompliance = pmTotal? Math.round(100*pmDone/pmTotal) : 0;

    const kpis = [
      {label:'Total Aset Terdaftar', value: totalAssets, icon:'box', tint:'blue', trend:{dir:'up',text:'+4 bulan ini'}},
      {label:'Rata-rata Asset Health (AHI)', value: avgAHI, icon:'activity', tint:'green', trend:{dir:'up',text:'+1.2 pts'}},
      {label:'Aset Kritis', value: criticalAssets, icon:'alertTriangle', tint:'red'},
      {label:'Risiko High/Critical', value: openRisks, icon:'shield', tint:'amber'},
      {label:'Anomali Sensus', value: anomalyCount, icon:'search', tint:'violet'},
      {label:'PM Compliance', value: pmCompliance+'%', icon:'wrench', tint:'gold'},
    ];

    // aggregates
    const byCategory = {};
    assets.forEach(a=> byCategory[a.category]=(byCategory[a.category]||0)+1);
    const byCondition = {1:0,2:0,3:0,4:0,5:0};
    assets.forEach(a=> byCondition[a.condition_score]++);
    const byRiskLevel = {Low:0,Medium:0,High:0,Critical:0};
    D.risks.forEach(r=> byRiskLevel[r.level]++);
    const byDecision = {KEEP:0,MAINTAIN:0,REFURBISH:0,REPLACE:0,DISPOSE:0};
    D.asset_kpis.forEach(k=> byDecision[k.decision]++);
    const byCostType = {};
    D.costs.forEach(c=> byCostType[c.cost_type]=(byCostType[c.cost_type]||0)+c.amount);

    // recent activity: merge mutasi + wo + disposals
    const recent = [
      ...D.mutasi.map(m=>({date:m.request_date, text:`Mutasi ${m.change_type} — ${m.asset_name}`, status:m.status, icon:'shuffle'})),
      ...D.work_orders.filter(w=>w.status==='Selesai').map(w=>({date:w.completed_date||w.scheduled_date, text:`Work Order selesai — ${w.asset_name}`, status:w.status, icon:'wrench'})),
      ...D.disposals.map(d=>({date:d.date, text:`Pengajuan disposal — ${d.asset_name}`, status:d.approval, icon:'trash'})),
    ].sort((a,b)=> (b.date||'').localeCompare(a.date||'')).slice(0,8);

    qs('#content').innerHTML = `
      ${pageHead({title:'Dashboard Eksekutif', desc:`Ringkasan kinerja aset ${D.org} — diperbarui ${fmtDate(D.generated_at)}.`, actions:`
        <button class="btn btn-outline btn-sm" id="dash-export">${icon('download')}Unduh Ringkasan</button>`})}
      ${kpiCardsHtml(kpis)}

      <div class="grid-2" style="margin-bottom:16px">
        <div class="chart-card">
          <h3>Distribusi Aset per Kategori</h3>
          <div class="sub">Total ${totalAssets} aset terdaftar pada BMN Register</div>
          <div class="chart-wrap"><canvas id="chart-category"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Distribusi Kondisi Aset</h3>
          <div class="sub">Skor kondisi 1 (rusak berat) – 5 (sangat baik)</div>
          <div class="chart-wrap"><canvas id="chart-condition"></canvas></div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:16px">
        <div class="chart-card">
          <h3>Rekomendasi Lifecycle Decision</h3>
          <div class="sub">Berdasarkan Asset Health Index (AHI) — 30 aset tersampel</div>
          <div class="chart-wrap"><canvas id="chart-decision"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Sebaran Level Risiko</h3>
          <div class="sub">Risk register aktif — ${D.risks.length} entri</div>
          <div class="chart-wrap"><canvas id="chart-risk"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <div><h3>Aktivitas Terbaru</h3><div class="sub">Mutasi, maintenance dan disposal terbaru lintas modul</div></div>
          </div>
          <div class="panel-body" style="padding-top:14px">
            <div class="timeline">
              ${recent.map(r=>`<div class="timeline-item"><div class="timeline-dot">${''}</div><div>
                <div class="t-title">${esc(r.text)}</div>
                <div class="t-meta">${fmtDate(r.date)} · ${badgeHtml(r.status, badgeClassFor('status', r.status))}</div>
              </div></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Ringkasan Kepatuhan</h3><div class="sub">Governance &amp; audit snapshot</div></div></div>
          <div class="panel-body">
            <div class="def-item" style="margin-bottom:14px"><span class="k">Temuan Audit Terbuka</span><span class="v">${D.audits.filter(a=>a.status==='Open').length} dari ${D.audits.length}</span></div>
            <div class="def-item" style="margin-bottom:14px"><span class="k">Rekonsiliasi Signed-off</span><span class="v">${D.recon_batches.filter(b=>b.status==='Signed-off').length} dari ${D.recon_batches.length} batch</span></div>
            <div class="def-item" style="margin-bottom:14px"><span class="k">Sertifikat Sanitasi Terverifikasi</span><span class="v">${D.sanitizations.filter(s=>s.verification==='Lulus Verifikasi').length} dari ${D.sanitizations.length}</span></div>
            <div class="def-item"><span class="k">Objective KPI Tercapai</span><span class="v">${D.governance.objectives.filter(o=>{const t=parseFloat(o.target)||0, a=parseFloat(o.actual)||0; return t===0 ? a<=t : a>=t;}).length} dari ${D.governance.objectives.length}</span></div>
          </div>
        </div>
      </div>
    `;

    qs('#dash-export').addEventListener('click', ()=> toast('Simulasi ekspor ringkasan eksekutif (PDF).'));

    makeChart(qs('#chart-category'), {
      type:'doughnut',
      data:{ labels:Object.keys(byCategory), datasets:[{data:Object.values(byCategory), backgroundColor:CHART_PALETTE, borderWidth:0}] },
      options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:9, font:{size:10.5}}}}, cutout:'62%', maintainAspectRatio:false }
    });
    makeChart(qs('#chart-condition'), {
      type:'bar',
      data:{ labels:['1 - Rusak Berat','2 - Kurang','3 - Cukup','4 - Baik','5 - Sangat Baik'],
        datasets:[{data:[byCondition[1],byCondition[2],byCondition[3],byCondition[4],byCondition[5]],
          backgroundColor:['#dc2626','#d97706','#2563eb','#16a34a','#15803d'], borderRadius:6, maxBarThickness:36 }] },
      options:{ plugins:{legend:{display:false}}, maintainAspectRatio:false, scales:{y:{beginAtZero:true, ticks:{precision:0}}} }
    });
    makeChart(qs('#chart-decision'), {
      type:'bar',
      data:{ labels:Object.keys(byDecision), datasets:[{data:Object.values(byDecision),
        backgroundColor:['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed'], borderRadius:6, maxBarThickness:40 }] },
      options:{ indexAxis:'y', plugins:{legend:{display:false}}, maintainAspectRatio:false, scales:{x:{beginAtZero:true, ticks:{precision:0}}} }
    });
    makeChart(qs('#chart-risk'), {
      type:'polarArea',
      data:{ labels:Object.keys(byRiskLevel), datasets:[{data:Object.values(byRiskLevel),
        backgroundColor:['#dbeafe99','#bfdbfe99','#fde68a99','#fecaca99'] }] },
      options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:9, font:{size:10.5}}}}, maintainAspectRatio:false }
    });
  }

  function renderMasterData(){
    const locByBuilding = {};
    D.locations.forEach(l=> locByBuilding[l.building]=(locByBuilding[l.building]||0)+1);
    const assetsByCategory = {};
    D.assets.forEach(a=> assetsByCategory[a.category]=(assetsByCategory[a.category]||0)+1);

    qs('#content').innerHTML = `
      ${pageHead({title:'Master Data', desc:MODULES['master-data'].desc, actions:`<button class="btn btn-primary btn-sm" id="new-location">${icon('plus')}Tambah Lokasi</button>`})}
      <div class="module-hint">${icon('info')}<span>Master Data adalah fondasi referensi seluruh transaksi — organisasi, lokasi, kategori, vendor dan parameter workflow. Perubahan pada modul ini memengaruhi seluruh modul operasional.</span></div>

      <div class="grid-3" style="margin-bottom:18px">
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon tint-blue">${icon('building')}</div></div><div class="kpi-value">${D.buildings.length}</div><div class="kpi-label">Gedung Terdaftar</div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon tint-green">${icon('mapPin')}</div></div><div class="kpi-value">${D.locations.length}</div><div class="kpi-label">Titik Lokasi (Ruang/Lab)</div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon tint-violet">${icon('layers')}</div></div><div class="kpi-value">${D.categories.length}</div><div class="kpi-label">Kategori Aset</div></div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Gedung &amp; Lokasi</h3></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Gedung</th><th>Kode</th><th>Jumlah Titik Lokasi</th></tr></thead>
            <tbody>${D.buildings.map(b=>`<tr><td class="cell-strong">${esc(b.name)}</td><td class="cell-mono">${esc(b.id)}</td><td>${locByBuilding[b.name]||0}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Kategori Aset</h3></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Kategori</th><th>Kode</th><th>Jumlah Aset</th></tr></thead>
            <tbody>${D.categories.map(c=>`<tr><td class="cell-strong">${esc(c.name)}</td><td class="cell-mono">${esc(c.code)}</td><td>${assetsByCategory[c.name]||0}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>

      <div class="panel" style="margin-top:16px">
        <div class="panel-head"><h3>Unit Kerja</h3></div>
        <div class="panel-body">
          <div class="thumb-row" style="gap:8px">
            ${D.units.map(u=>`<span class="badge b-slate" style="padding:6px 12px;font-size:12px">${esc(u)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    qs('#new-location').addEventListener('click', ()=> openAddForm('master-location'));
  }

  function renderLifecycle(){
    const statusCounts = {};
    D.assets.forEach(a=> statusCounts[a.status]=(statusCounts[a.status]||0)+1);
    const order = ['In Use','Reserved','Under Maintenance','In Storage','Disposed'];
    const events = [
      ...D.mutasi.map(m=>({date:m.request_date, asset:m.asset_name, type:'Mutasi/'+m.change_type, status:m.status})),
      ...D.disposals.map(d=>({date:d.date, asset:d.asset_name, type:'Disposal', status:d.approval})),
      ...D.jml_events.map(j=>({date:j.event_date, asset:j.asset_id, type:'JML/'+j.event_type, status:j.status})),
    ].sort((a,b)=> (b.date||'').localeCompare(a.date||''));

    qs('#content').innerHTML = `
      ${pageHead({title:'Asset Lifecycle', desc:MODULES['asset-lifecycle'].desc})}
      <div class="panel" style="margin-bottom:16px">
        <div class="panel-head"><h3>Status Lifecycle Aset Saat Ini</h3><div class="sub">${D.assets.length} aset</div></div>
        <div class="panel-body">
          ${order.map(st=>{
            const n = statusCounts[st]||0;
            const pct = Math.round(100*n/D.assets.length);
            const colors = {'In Use':'green-600','Reserved':'blue-500','Under Maintenance':'amber-600','In Storage':'slate-600','Disposed':'red-600'};
            return `<div style="margin-bottom:14px">
              <div class="flex items-center" style="justify-content:space-between;margin-bottom:5px;font-size:12.5px">
                <span>${esc(st)}</span><b>${n} aset (${pct}%)</b>
              </div>
              <div class="progress"><i style="width:${pct}%;background:var(--${colors[st]})"></i></div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Riwayat Event Lifecycle Terbaru</h3><div class="sub">Gabungan mutasi, JML dan disposal</div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Tanggal</th><th>Aset</th><th>Jenis Event</th><th>Status</th></tr></thead>
          <tbody>${events.slice(0,18).map(e=>`<tr><td>${fmtDate(e.date)}</td><td class="cell-strong">${esc(e.asset)}</td><td>${esc(e.type)}</td><td>${badgeHtml(e.status, badgeClassFor('status', e.status))}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
  }

  function renderSensus(){
    const plans = D.sensus_plans;
    const totalAnomaly = D.sensus_items.filter(s=>s.result==='Anomali').length;
    const totalScanned = plans.reduce((a,p)=>a+p.scanned_count,0);
    const totalTarget = plans.reduce((a,p)=>a+p.target_count,0);

    const kpis = [
      {label:'Rencana Sensus', value: plans.length, icon:'clipcheck', tint:'blue'},
      {label:'Total Aset Discan', value: totalScanned, icon:'checkCircle', tint:'green'},
      {label:'Completion Rate', value: Math.round(100*totalScanned/totalTarget)+'%', icon:'activity', tint:'violet'},
      {label:'Anomali Ditemukan', value: totalAnomaly, icon:'alertTriangle', tint:'red'},
    ];

    qs('#content').innerHTML = `
      ${pageHead({title:'Sensus & Inventarisasi', desc:MODULES['sensus'].desc, actions:`<button class="btn btn-primary btn-sm" id="new-sensus">${icon('plus')}Buat Rencana Sensus</button>`})}
      ${kpiCardsHtml(kpis)}
      <div class="panel" style="margin-bottom:16px">
        <div class="panel-head"><h3>Rencana Sensus</h3><div class="sub">Klik baris untuk melihat detail hasil scan</div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>ID Sensus</th><th>Area</th><th>Petugas</th><th>Progress</th><th>Anomali</th><th>Status</th></tr></thead>
          <tbody id="sensus-body">
          ${plans.map(p=>{
            const pct = Math.round(100*p.scanned_count/p.target_count);
            return `<tr data-id="${p.sensus_id}">
              <td class="cell-mono">${esc(p.sensus_id)}</td>
              <td class="cell-strong">${esc(p.area)}</td>
              <td>${esc(p.petugas)}</td>
              <td style="min-width:160px"><div class="flex items-center gap-8"><div class="progress" style="flex:1"><i style="width:${pct}%;background:var(--blue-500)"></i></div><span class="cell-muted">${p.scanned_count}/${p.target_count}</span></div></td>
              <td>${p.anomaly_count>0?badgeHtml(p.anomaly_count+' anomali','b-red'):badgeHtml('Nihil','b-green')}</td>
              <td>${badgeHtml(p.status, badgeClassFor('status', p.status))}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Antrian Anomali</h3><div class="sub">Seluruh temuan anomali lintas sensus — butuh investigasi/recheck</div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>ID Item</th><th>Aset</th><th>Jenis Anomali</th><th>Lokasi</th><th>Waktu Scan</th></tr></thead>
          <tbody>${D.sensus_items.filter(s=>s.result==='Anomali').slice(0,30).map(s=>`
            <tr><td class="cell-mono">${esc(s.item_id)}</td><td class="cell-strong">${esc(s.asset_name)}</td>
            <td>${badgeHtml(s.anomaly_type, badgeClassFor('anomaly', s.anomaly_type))}</td>
            <td class="cell-muted">${esc(s.location_label)}</td><td>${fmtDate(s.scan_time)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
    qs('#new-sensus').addEventListener('click', ()=> openAddForm('sensus-plan'));
    qs('#sensus-body').querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', ()=>{
        const plan = plans.find(p=>p.sensus_id===tr.dataset.id);
        const items = D.sensus_items.filter(i=>i.sensus_id===plan.sensus_id);
        openDrawer(`
          <div class="drawer-head"><div><h2>${esc(plan.area)}</h2><div class="meta">${esc(plan.sensus_id)} · Petugas: ${esc(plan.petugas)}</div></div><button class="drawer-close">${icon('x')}</button></div>
          <div class="drawer-body">
            <div class="section-title">Ringkasan</div>
            ${defGrid(plan, ['sensus_id','area','petugas','start_date','status','target_count','scanned_count','anomaly_count'])}
            <div class="section-title">Hasil Scan (${items.length})</div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Aset</th><th>Hasil</th><th>Kondisi</th><th>Lokasi</th></tr></thead>
              <tbody>${items.map(i=>`<tr><td class="cell-strong">${esc(i.asset_name)}</td><td>${badgeHtml(i.result, i.result==='Anomali'?'b-red':'b-green')}</td><td>${esc(i.condition_label)}</td><td class="cell-muted">${esc(i.location_label)}</td></tr>`).join('')}</tbody>
            </table></div>
          </div>
          <div class="drawer-foot"><button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button></div>
        `);
        qs('#drawer-close2').addEventListener('click', closeDrawer);
      });
    });
  }

  function renderReconciliation(){
    const batches = D.recon_batches;
    const totalItems = batches.reduce((a,b)=>a+b.total_items,0);
    const totalMatched = batches.reduce((a,b)=>a+b.matched,0);
    const totalException = batches.reduce((a,b)=>a+b.exception,0);

    const kpis = [
      {label:'Batch Rekonsiliasi', value: batches.length, icon:'refresh', tint:'blue'},
      {label:'Total Item Dicocokkan', value: totalItems, icon:'box', tint:'violet'},
      {label:'Matched', value: totalMatched, icon:'checkCircle', tint:'green'},
      {label:'Exception', value: totalException, icon:'alertTriangle', tint:'red'},
    ];

    qs('#content').innerHTML = `
      ${pageHead({title:'SAKTI/SIMAN Reconciliation', desc:MODULES['reconciliation'].desc, actions:`<button class="btn btn-primary btn-sm" id="new-batch">${icon('plus')}Tambah Batch Baru</button>`})}
      ${kpiCardsHtml(kpis)}
      <div class="panel">
        <div class="panel-head"><h3>Batch Rekonsiliasi</h3><div class="sub">Klik baris untuk melihat detail item &amp; exception</div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>ID Batch</th><th>Periode</th><th>Sumber</th><th>Progress Match</th><th>Exception</th><th>Status</th></tr></thead>
          <tbody id="recon-body">
          ${batches.map(b=>{
            const pct = Math.round(100*b.matched/b.total_items);
            return `<tr data-id="${b.batch_id}">
              <td class="cell-mono">${esc(b.batch_id)}</td><td class="cell-strong">${esc(b.period)}</td><td class="cell-muted">${esc(b.file)}</td>
              <td style="min-width:160px"><div class="flex items-center gap-8"><div class="progress" style="flex:1"><i style="width:${pct}%;background:var(--green-600)"></i></div><span class="cell-muted">${pct}%</span></div></td>
              <td>${b.exception>0?badgeHtml(b.exception+' exception','b-amber'):badgeHtml('Nihil','b-green')}</td>
              <td>${badgeHtml(b.status, badgeClassFor('status', b.status))}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>
      </div>
    `;
    qs('#new-batch').addEventListener('click', ()=> openAddForm('recon-batch'));
    qs('#recon-body').querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', ()=>{
        const batch = batches.find(b=>b.batch_id===tr.dataset.id);
        const items = D.recon_items.filter(i=>i.batch_id===batch.batch_id);
        openDrawer(`
          <div class="drawer-head"><div><h2>${esc(batch.period)}</h2><div class="meta">${esc(batch.batch_id)} · ${esc(batch.file)}</div></div><button class="drawer-close">${icon('x')}</button></div>
          <div class="drawer-body">
            <div class="section-title">Ringkasan Batch</div>
            ${defGrid(batch, ['batch_id','period','source','file','status','total_items','matched','exception'])}
            <div class="section-title">Item &amp; Exception (${items.length})</div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>BMN UID</th><th>Aset</th><th>Status Match</th><th>Catatan</th></tr></thead>
              <tbody>${items.map(i=>`<tr><td class="cell-mono">${esc(i.bmn_uid)}</td><td class="cell-strong">${esc(i.asset_name)}</td><td>${badgeHtml(i.match_status, badgeClassFor('status', i.match_status))}</td><td class="cell-muted">${esc(i.exception_note||'—')}</td></tr>`).join('')}</tbody>
            </table></div>
          </div>
          <div class="drawer-foot">
            <button class="btn btn-outline btn-sm" id="drawer-signoff">${icon('checkCircle')}Sign-off Periode</button>
            <button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button>
          </div>
        `);
        qs('#drawer-close2').addEventListener('click', closeDrawer);
        qs('#drawer-signoff').addEventListener('click', ()=> toast('Simulasi sign-off periode rekonsiliasi.'));
      });
    });
  }

  function renderCyber(){
    const cyberAssets = D.cyber_assets;
    const kpis = [
      {label:'Aset Siber Terdaftar', value: cyberAssets.length, icon:'shield', tint:'blue'},
      {label:'Klasifikasi Sangat Rahasia', value: cyberAssets.filter(c=>c.classification==='Sangat Rahasia').length, icon:'alertTriangle', tint:'red'},
      {label:'Akses 30 Hari Terakhir', value: cyberAssets.reduce((a,c)=>a+c.access_count_30d,0), icon:'activity', tint:'violet'},
      {label:'Access Log Tercatat', value: D.access_logs.length, icon:'clipList', tint:'gold'},
    ];
    qs('#content').innerHTML = `
      ${pageHead({title:'Cyber Asset Management', desc:MODULES['cyber'].desc, actions:`<button class="btn btn-primary btn-sm" id="new-cyber-asset">${icon('plus')}Tambah Aset Siber</button>`})}
      ${kpiCardsHtml(kpis)}
      <div class="module-hint">${icon('shield')}<span>SIMASET hanya menyimpan metadata manajemen aset siber; secret dan cryptographic key material tidak disimpan pada sistem ini.</span></div>
      <div class="panel" style="margin-bottom:16px">
        <div class="panel-head"><h3>Register Aset Siber &amp; Kripto</h3><div class="sub">Klik baris untuk melihat access log</div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>ID</th><th>Nama Aset</th><th>Klasifikasi</th><th>Custodian</th><th>Otorisasi</th><th>Akses Terakhir</th></tr></thead>
          <tbody id="cyber-body">
          ${cyberAssets.map(c=>`<tr data-id="${c.cyber_asset_id}">
            <td class="cell-mono">${esc(c.cyber_asset_id)}</td><td class="cell-strong">${esc(c.name)}</td>
            <td>${badgeHtml(c.classification, badgeClassFor('cls', c.classification))}</td>
            <td>${esc(c.custodian)}</td><td class="cell-muted">${esc(c.authorization)}</td><td>${fmtDate(c.last_access)}</td>
          </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Access Log Terbaru</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Waktu</th><th>Aset</th><th>Pengguna</th><th>Aksi</th><th>Hasil</th></tr></thead>
          <tbody>${D.access_logs.slice(0,15).map(l=>`<tr><td>${fmtDate(l.timestamp)}</td><td class="cell-strong">${esc(l.asset_name)}</td><td>${esc(l.user)}</td><td>${esc(l.action)}</td><td>${badgeHtml(l.result, l.result==='Berhasil'?'b-green':'b-red')}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
    qs('#new-cyber-asset').addEventListener('click', ()=> openAddForm('cyber-asset'));
    qs('#cyber-body').querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', ()=>{
        const ca = cyberAssets.find(c=>c.cyber_asset_id===tr.dataset.id);
        const logs = D.access_logs.filter(l=>l.cyber_asset_id===ca.cyber_asset_id);
        openDrawer(`
          <div class="drawer-head"><div><h2>${esc(ca.name)}</h2><div class="meta">${esc(ca.cyber_asset_id)}</div></div><button class="drawer-close">${icon('x')}</button></div>
          <div class="drawer-body">
            <div class="section-title">Informasi Umum</div>
            ${defGrid(ca, ['cyber_asset_id','asset_id','name','classification','custodian','authorization','movement_monitoring'])}
            <div class="section-title">Access Log (${logs.length})</div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Hasil</th></tr></thead>
              <tbody>${logs.map(l=>`<tr><td>${fmtDate(l.timestamp)}</td><td>${esc(l.user)}</td><td>${esc(l.action)}</td><td>${badgeHtml(l.result, l.result==='Berhasil'?'b-green':'b-red')}</td></tr>`).join('') || `<tr><td colspan="4" class="cell-muted">Belum ada log tercatat.</td></tr>`}</tbody>
            </table></div>
          </div>
          <div class="drawer-foot"><button class="btn btn-primary btn-sm" id="drawer-close2">Tutup</button></div>
        `);
        qs('#drawer-close2').addEventListener('click', closeDrawer);
      });
    });
  }

  function renderGovernance(){
    const g = D.governance;
    qs('#content').innerHTML = `
      ${pageHead({title:'ISO 55000/55001 Governance', desc:MODULES['governance'].desc})}
      <div class="module-hint">${icon('info')}<span>Aplikasi adalah alat pendukung; penggunaan aplikasi saja tidak otomatis menyatakan organisasi compliant terhadap ISO 55000/55001.</span></div>

      <div class="grid-2" style="margin-bottom:16px">
        <div class="panel">
          <div class="panel-head"><h3>Asset Management Policy</h3></div>
          <div class="panel-body">
            ${g.policy.map(p=>`<div class="def-grid">
              ${defGrid(p, ['id','title','version','status','approved_by','date'])}
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>SAMP &amp; Asset Management Plan</h3></div>
          <div class="panel-body">
            ${g.samp.map(s=>`<div style="margin-bottom:14px">${defGrid(s, ['id','title','status','date'])}</div>`).join('')}
            ${g.amp.map(a=>defGrid(a, ['id','title','program','resource','target'])).join('')}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:16px">
        <div class="panel-head"><h3>Objectives &amp; KPI</h3><div class="sub">Target vs aktual periode 2026</div></div>
        <div class="panel-body">
          ${g.objectives.map(o=>{
            const target = parseFloat(o.target)||0;
            const actual = parseFloat(o.actual)||0;
            const lowerIsBetter = target===0; // e.g. "zero repeat finding" style objectives
            const met = lowerIsBetter ? actual<=target : actual>=target;
            const pct = lowerIsBetter ? (actual>0?100:0) : (target ? Math.min(100, Math.round(100*actual/target)) : 0);
            return `<div style="margin-bottom:14px">
              <div class="flex items-center" style="justify-content:space-between;margin-bottom:5px;font-size:12.5px">
                <span>${esc(o.title)}</span>
                <b style="color:var(--${met?'green-700':'red-700'})">${esc(o.actual)} / ${esc(o.target)}</b>
              </div>
              <div class="progress"><i style="width:${pct}%;background:var(--${met?'green-600':(lowerIsBetter?'red-600':'amber-600')})"></i></div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Management Review</h3></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Periode</th><th>Input</th><th>Tindak Lanjut</th><th>Status</th></tr></thead>
            <tbody>${g.management_review.map(m=>`<tr><td class="cell-strong">${esc(m.period)}</td><td class="cell-muted">${esc(m.input)}</td><td>${esc(m.action)}</td><td>${badgeHtml(m.status, badgeClassFor('status', m.status))}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Continual Improvement Register</h3>
            <button class="btn btn-outline btn-sm" id="new-improvement">${icon('plus')}Tambah</button>
          </div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>ID</th><th>Improvement</th><th>Terhubung</th><th>Status</th></tr></thead>
            <tbody>${g.improvement.map(i=>`<tr><td class="cell-mono">${esc(i.id)}</td><td class="cell-strong">${esc(i.title)}</td><td class="cell-muted">${esc(i.linked)}</td><td>${badgeHtml(i.status, badgeClassFor('status', i.status))}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>
    `;
    qs('#new-improvement').addEventListener('click', ()=> openAddForm('governance-improvement'));
  }

  // =============================================================================
  // ROUTER
  // =============================================================================
  function route(){
    destroyCharts();
    closeDrawer();
    document.querySelectorAll('.report-overlay, .tag-print-overlay').forEach(el=> el.remove());
    const hash = window.location.hash.replace(/^#\//,'') || 'dashboard';
    renderSidebar(hash);
    window.scrollTo(0,0);

    if(hash==='dashboard'){ renderDashboard(); return; }
    const cfg = MODULES[hash];
    if(!cfg){ renderDashboard(); window.location.hash = '#/dashboard'; return; }

    if(cfg.custom==='master-data') return renderMasterData();
    if(cfg.custom==='lifecycle') return renderLifecycle();
    if(cfg.custom==='sensus') return renderSensus();
    if(cfg.custom==='reconciliation') return renderReconciliation();
    if(cfg.custom==='cyber') return renderCyber();
    if(cfg.custom==='governance') return renderGovernance();

    mountListPage(cfg, { moduleId: hash });
  }

  // Global search (simple: jump to BMN Register with query reflected in toast)
  qs('#global-search').addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.value.trim()){
      window.location.hash = '#/bmn-register';
      toast(`Menampilkan hasil pencarian untuk "${e.target.value.trim()}" pada BMN Register.`);
      setTimeout(()=>{
        const s = qs('#list-search');
        if(s){ s.value = e.target.value; s.dispatchEvent(new Event('input')); }
      }, 60);
    }
  });

  window.addEventListener('hashchange', route);
  route();

})();
