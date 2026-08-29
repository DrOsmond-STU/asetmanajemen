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

  function esc(s){
    if(s==null) return '';
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function initials(name){
    return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  }

  // ---- Topbar / user ------------------------------------------------------
  qs('#sb-logo').innerHTML = icon('shield');
  qs('#sb-logo').querySelector('svg').style.cssText='width:20px;height:20px;color:#fff';
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

    qs('#content').innerHTML = `
      ${pageHead({title:config.title, desc:config.desc, actions: options.actionsHtml || `
        <button class="btn btn-outline btn-sm" id="export-btn">${icon('download')}Ekspor</button>
        <button class="btn btn-primary btn-sm" id="add-btn">${icon('plus')}Tambah Baru</button>`})}
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
    const exportBtn = qs('#export-btn'); if(exportBtn) exportBtn.addEventListener('click', ()=> toast('Simulasi ekspor: file akan diunduh pada sistem produksi.'));
    const addBtn = qs('#add-btn'); if(addBtn) addBtn.addEventListener('click', ()=> toast('Form tambah data tidak diaktifkan pada purwarupa ini.'));

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
      ${pageHead({title:'Master Data', desc:MODULES['master-data'].desc})}
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
    qs('#new-sensus').addEventListener('click', ()=> toast('Form rencana sensus baru tidak diaktifkan pada purwarupa ini.'));
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
      ${pageHead({title:'SAKTI/SIMAN Reconciliation', desc:MODULES['reconciliation'].desc, actions:`<button class="btn btn-primary btn-sm" id="new-batch">${icon('plus')}Import Batch Baru</button>`})}
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
    qs('#new-batch').addEventListener('click', ()=> toast('Simulasi import batch CSV/Excel dari SAKTI/SIMAN.'));
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
      ${pageHead({title:'Cyber Asset Management', desc:MODULES['cyber'].desc})}
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
          <div class="panel-head"><h3>Continual Improvement Register</h3></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>ID</th><th>Improvement</th><th>Terhubung</th><th>Status</th></tr></thead>
            <tbody>${g.improvement.map(i=>`<tr><td class="cell-mono">${esc(i.id)}</td><td class="cell-strong">${esc(i.title)}</td><td class="cell-muted">${esc(i.linked)}</td><td>${badgeHtml(i.status, badgeClassFor('status', i.status))}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>
    `;
  }

  function renderReportsExtra(){
    // called after mounting reporting list page, attach generate handlers
    document.querySelectorAll('#list-table-body tr').forEach(()=>{});
  }

  // =============================================================================
  // ROUTER
  // =============================================================================
  function route(){
    destroyCharts();
    closeDrawer();
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

    mountListPage(cfg);
    if(hash==='reporting'){
      // add "generate" action column behavior via row click already opens generic detail;
      // add quick-download buttons per row
      document.querySelectorAll('#list-table-body tr').forEach(tr=>{
        tr.style.cursor='pointer';
      });
    }
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
