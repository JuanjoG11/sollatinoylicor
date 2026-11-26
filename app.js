/* POS - Sol Latino & Licores San Pedro */

const SUPA_URL  = 'https://tlnvsykzbjucwotfwoll.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbnZzeWt6Ymp1Y3dvdGZ3b2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MDk1OTgsImV4cCI6MjExMDQ4NTU5OH0._c0sP3g7MD62EDq5YLrTMQGuIEH6j7egp9tXkxtOGO0';

const supa = {
  _h: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
  async selectRaw(table, params) {
    const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?'+params, { headers: supa._h });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(SUPA_URL+'/rest/v1/'+table, { method:'POST', headers: supa._h, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, { method:'PATCH', headers: supa._h, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async upsert(table, data) {
    const h = { ...supa._h, 'Prefer': 'resolution=merge-duplicates,return=representation' };
    const r = await fetch(SUPA_URL+'/rest/v1/'+table, { method:'POST', headers: h, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, { method:'DELETE', headers: supa._h });
    if (!r.ok) throw new Error(await r.text());
    return true;
  }
};

const S = {
  co: 'sol',
  cart: [],
  pay: 'efectivo',
  editProd: null,
  editClient: null,
  camStream: null,
  charts: {},
  dashCo: 'all',
  cfg: { footSol: 'Gracias por tu visita! - El Sol Latino', footLic: 'Vuelve pronto! - Licores San Pedro' },
  _prods: [], _ventas: [], _clients: [], _traces: [], _apartados: []
};

const DB = {
  prods:   () => S._prods,
  ventas:  () => S._ventas,
  clients: () => S._clients,
  
  cfg:     () => S.cfg,
  async loadAll() {
    try {
      const [prods, ventas, clients, traces, cfgRows, soportesRows, apartadosRows] = await Promise.all([
        supa.selectRaw('productos', 'select=*&order=created_at.desc'),
        supa.selectRaw('ventas',    'select=*&order=ts.desc'),
        supa.selectRaw('clientes',  'select=*&order=created_at.desc'),
        supa.selectRaw('trazas',    'select=*&order=ts.desc&limit=100'),
        supa.selectRaw('config',    'select=*'),
        supa.selectRaw('soportes',  'select=*&order=ts.desc&limit=300'),
        supa.selectRaw('apartados', 'select=*&order=ts_creacion.desc').catch(() => []),
      ]);
      S._prods   = (prods   || []).map(fromDBProd);
      S._ventas  = (ventas  || []).map(fromDBVenta);
      S._clients = (clients || []).map(fromDBClient);
      S._traces = [];
      S._apartados = (apartadosRows || []).map(fromDBApd);
      (cfgRows || []).forEach(r => { if (r.key in S.cfg) S.cfg[r.key] = r.value; });
      return true;
    } catch(e) {
      console.error('loadAll:', e);
      return false;
    }
  }
};

const save = {
  async prod(p) {
    const idx = S._prods.findIndex(x => x.id === p.id);
    if (idx !== -1) { S._prods[idx] = p; await supa.upsert('productos', toDBProd(p)); }
    else { S._prods.unshift(p); await supa.insert('productos', toDBProd(p)); }
  },
  async deleteProd(id) { S._prods = S._prods.filter(p => p.id !== id); await supa.delete('productos', id); },
  async venta(v) { S._ventas.unshift(v); await supa.insert('ventas', toDBVenta(v)); },
  async client(c) {
    const idx = S._clients.findIndex(x => x.id === c.id);
    if (idx !== -1) { S._clients[idx] = c; await supa.upsert('clientes', toDBClient(c)); }
    else { S._clients.unshift(c); await supa.insert('clientes', toDBClient(c)); }
  },
  async deleteClient(id) { S._clients = S._clients.filter(c => c.id !== id); await supa.delete('clientes', id); },
  async trace(t) { S._traces.unshift(t); await supa.insert('trazas', toDBTrace(t)); },
  async cfg(key, value) { S.cfg[key] = value; await supa.upsert('config', { key, value }); }
};

function toDBProd(p) {
  return { id:p.id, co:p.co, bc:p.bc, name:p.name, cat:p.cat, price:p.price, cost:p.cost||0,
    stock:p.stock, min:p.min, emoji:p.emoji||'', description:p.desc||'',
    last_sale:p.lastSale||null, last_movement:p.lastMovement||null,
    fecha_vencimiento:p.fechaVenc||null, dias_alerta_venc:p.diasAlerta||7, lote:p.lote||null,
    created_at:p.createdAt||new Date().toISOString(), updated_at:new Date().toISOString() };
}
function fromDBProd(r) {
  return { id:r.id, co:r.co, bc:r.bc, name:r.name, cat:r.cat,
    price:parseFloat(r.price), cost:parseFloat(r.cost||0),
    stock:parseInt(r.stock), min:parseInt(r.min),
    emoji:r.emoji||'', desc:r.description||'',
    lastSale:r.last_sale, lastMovement:r.last_movement,
    fechaVenc:r.fecha_vencimiento||null, diasAlerta:parseInt(r.dias_alerta_venc||7), lote:r.lote||null,
    createdAt:r.created_at, updatedAt:r.updated_at };
}
function toDBVenta(v) {
  return { id:v.id, inv_num:v.invNum, co:v.co, client_id:v.clientId||null,
    client_name:v.clientName, items:v.items, sub:v.sub, disc:v.disc, dp:v.dp,
    tax:v.tax, tot:v.tot, pay:v.pay, cash_rec:v.cashRec||null, ts:v.ts };
}
function fromDBVenta(r) {
  return { id:r.id, invNum:r.inv_num, co:r.co, clientId:r.client_id, clientName:r.client_name,
    items:r.items||[], sub:parseFloat(r.sub), disc:parseFloat(r.disc), dp:parseFloat(r.dp),
    tax:parseFloat(r.tax), tot:parseFloat(r.tot), pay:r.pay,
    cashRec:r.cash_rec?parseFloat(r.cash_rec):null, ts:r.ts };
}
function toDBClient(c) {
  return { id:c.id, name:c.name, email:c.email||null, phone:c.phone||null,
    nif:c.nif||null, addr:c.addr||null, total_buy:c.totalBuy||0,
    last_buy:c.lastBuy||null, created_at:c.createdAt||new Date().toISOString() };
}
function fromDBClient(r) {
  return { id:r.id, name:r.name, email:r.email, phone:r.phone, nif:r.nif, addr:r.addr,
    totalBuy:parseFloat(r.total_buy||0), lastBuy:r.last_buy, createdAt:r.created_at };
}
function toDBTrace(t) { return { id:t.id, type:t.type, co:t.co, descripcion:t.desc, detail:t.detail||'', ts:t.ts }; }
function fromDBTrace(r) { return { id:r.id, type:r.type, co:r.co, desc:r.descripcion, detail:r.detail||'', ts:r.ts }; }

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const genBC = () => { document.getElementById('pBC').value = '20'+Date.now().toString().slice(-10); };
const eur = n => '\u20AC' + Number(n).toFixed(2);
const dtFull = s => { const d=new Date(s); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); };
const dtShort = s => new Date(s).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
const tFmt = s => new Date(s).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});

async function trace(type, co, desc, detail) {
  const t = { id:uid(), type, co, desc, detail:detail||'', ts:new Date().toISOString() };
  try { await save.trace(t); } catch(e) { console.warn('trace:', e); }
}

function toast(msg, kind) {
  kind = kind || 'inf';
  const icons = { ok:'[OK]', err:'[ERR]', wrn:'[!]', inf:'[i]' };
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = '<span>' + (icons[kind]||'[i]') + '</span><span>' + msg + '</span>';
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.classList.add('out'); setTimeout(function(){el.remove();}, 220); }, 3200);
}

function tickClock() {
  const now = new Date();
  const s = now.toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'short'}) + ' - ' +
            now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('tbTime').textContent = s;
  document.getElementById('sbClock').textContent = s;
}

const TITLES = {
  pos:'Punto de Venta', dashboard:'Dashboard', productos:'Productos e Inventario',
  ventas:'Ventas', clientes:'Clientes', credito:'Credito y Deudas', devoluciones:'Devoluciones',
  soportes:'Soportes de Pago', config:'Configuracion', apartados:'Apartados / Pedidos'
};

function go(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('on'));
  const sec = document.getElementById('sec-'+name);
  if (sec) sec.classList.add('on');
  const lnk = document.querySelector('.nav-link[data-s="'+name+'"]');
  if (lnk) lnk.classList.add('on');
  document.getElementById('tbTitle').textContent = TITLES[name] || name;
  if (name==='dashboard')   renderDash();
  if (name==='productos')   { renderProdsTable(); renderStockTable(); }
  if (name==='ventas')      renderVentasTable();
  if (name==='clientes')    renderClientsTable();
  if (name==='config')      loadCfgUI();
  if (name==='credito')     renderDeudas();
  if (name==='soportes')    renderSoportes();
  if (name==='devoluciones') renderDevoluciones();
  if (name==='apartados')    renderApartados();
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    var isOn = b.id === 'tab-'+tab;
    b.style.color = isOn ? 'var(--text)' : 'var(--text-3)';
    b.style.fontWeight = isOn ? '700' : '600';
    b.style.borderBottomColor = isOn ? 'var(--accent)' : 'transparent';
  });
  ['catalogo','inventario'].forEach(function(p) {
    var el = document.getElementById('tab-pane-'+p);
    if (el) el.style.display = p===tab ? 'block' : 'none';
  });
  if (tab === 'catalogo')   renderProdsTable();
  if (tab === 'inventario') renderStockTable();
}
window.switchTab = switchTab;

function buildVencTag(p) {
  if (!p.fechaVenc) return '<span style="color:var(--text-3);font-size:.7rem;">-</span>';
  var fv = new Date(p.fechaVenc), hoy = new Date();
  var dias = Math.ceil((fv - hoy) / (1000*60*60*24));
  if (dias < 0)   return '<span class="tag tag-out" style="font-size:.65rem;">Vencido</span>';
  if (dias === 0) return '<span class="tag tag-out" style="font-size:.65rem;">Vence hoy</span>';
  if (dias <= (p.diasAlerta||7)) return '<span class="tag tag-low" style="font-size:.65rem;">'+dias+'d</span>';
  return '<span style="font-size:.7rem;color:var(--text-3);">'+dtShort(p.fechaVenc)+'</span>';
}
window.buildVencTag = buildVencTag;

// IVA por empresa: Sol Latino 5.5%, San Pedro (Licores) 20%
function taxRate(co) {
  return co === 'lic' ? 0.20 : 0.055;
}
function taxLabel(co) {
  return co === 'lic' ? 'IVA 20%' : 'IVA 5.5%';
}

function toggleSb() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.toggle('open');
  else document.getElementById('app').classList.toggle('collapsed');
}

function switchCo(co) {
  S.co = co;
  document.body.classList.toggle('lic-mode', co === 'lic');
  document.querySelectorAll('.cs-btn').forEach(b => b.classList.toggle('on', b.dataset.co === co));
  const name = co === 'sol' ? 'Sol Latino' : 'San Pedro';
  const logoSrc = co === 'sol' ? 'LOGO EL SOL LATINO.PNG' : 'LOGO LICORES SAN PEDRO PNG.png';
  const cbIcon = document.getElementById('cbIcon');
  if (cbIcon) { cbIcon.src = logoSrc; }
  document.getElementById('cbName').textContent = name;
  document.getElementById('sbPill').textContent = name;
  document.getElementById('sbPill').className = 'sb-pill ' + co;
  if (document.getElementById('cfgCo')) document.getElementById('cfgCo').value = co;
  renderProdGrid();
  calcTotals();
  toast('Empresa: ' + (co==='sol' ? 'El Sol Latino' : 'Licores San Pedro'), 'inf');
}
function cycleCo() { switchCo(S.co === 'sol' ? 'lic' : 'sol'); }

let curCat = 'all', curSearch = '';

function renderProdGrid() {
  const grid = document.getElementById('prodGrid');
  const prods = DB.prods().filter(function(p) {
    return p.co === S.co &&
      (curCat === 'all' || p.cat === curCat) &&
      (!curSearch || p.name.toLowerCase().includes(curSearch.toLowerCase()) || p.bc.includes(curSearch));
  });
  if (!prods.length) {
    grid.innerHTML = '<div class="empty-grid"><div class="ei" style="font-size:2rem;opacity:.2">[ ]</div><div class="et">Sin productos</div><div style="font-size:.7rem;color:var(--text-3);margin-top:.2rem">Agrega productos en Productos</div></div>';
    return;
  }
  grid.innerHTML = prods.map(function(p) {
    var st = p.stock <= 0 ? 'r' : p.stock <= p.min ? 'w' : 'g';
    var stl = p.stock <= 0 ? 'Sin stock' : p.stock <= p.min ? 'Min: '+p.stock : p.stock;
    var cls = p.stock <= 0 ? 'sold-out' : p.stock <= p.min ? 'low' : '';
    var em = p.emoji ? p.emoji : '';
    return '<div class="p-card '+cls+'" onclick="addToCart(\''+p.id+'\')">'
      + '<span class="pc-co '+p.co+'">'+(p.co==='sol'?'SL':'SP')+'</span>'
      + (em ? '<span class="pc-em">'+em+'</span>' : '<span class="pc-em" style="opacity:.18"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></span>')
      + '<div class="pc-nm">'+p.name+'</div>'
      + '<div class="pc-pr">'+eur(p.price)+'</div>'
      + '<div class="pc-st '+st+'">'+stl+'</div>'
      + '</div>';
  }).join('');
}

function setCat(cat, el) {
  curCat = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderProdGrid();
}
function onBcInput(v) { curSearch = v; renderProdGrid(); }
function onBcKey(e) {
  if (e.key !== 'Enter') return;
  var v = e.target.value.trim();
  if (!v) return;
  var p = DB.prods().find(x => x.bc === v);
  if (p) { addToCart(p.id); e.target.value = ''; curSearch = ''; renderProdGrid(); toast('Producto: '+p.name, 'ok'); }
  else   toast('Codigo "'+v+'" no encontrado', 'wrn');
}

async function toggleCam() {
  var wrap = document.getElementById('camWrap');
  if (!wrap.classList.contains('hidden')) { stopCam(); return; }
  wrap.classList.remove('hidden');
  try {
    S.camStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    document.getElementById('camVid').srcObject = S.camStream;
    toast('Camara activa', 'inf');
  } catch(err) { toast('Camara no disponible', 'err'); wrap.classList.add('hidden'); }
}
function stopCam() {
  if (S.camStream) S.camStream.getTracks().forEach(t => t.stop());
  S.camStream = null;
  document.getElementById('camWrap').classList.add('hidden');
}

function addToCart(id) {
  var p = DB.prods().find(x => x.id === id);
  if (!p) return;
  if (p.stock <= 0) { toast(p.name+' sin stock', 'wrn'); return; }
  var ex = S.cart.find(i => i.id === id);
  if (ex) {
    if (ex.qty >= p.stock) { toast('Stock maximo', 'wrn'); return; }
    ex.qty++;
  } else {
    S.cart.push({ id, name:p.name, price:p.price, emoji:p.emoji||'', qty:1 });
  }
  renderCart(); calcTotals();
}
function chQty(id, d) {
  var idx = S.cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  var p = DB.prods().find(x => x.id === id);
  S.cart[idx].qty += d;
  if (S.cart[idx].qty <= 0) S.cart.splice(idx, 1);
  else if (p && S.cart[idx].qty > p.stock) { S.cart[idx].qty = p.stock; toast('Stock maximo', 'wrn'); }
  renderCart(); calcTotals();
}
function rmFromCart(id) { S.cart = S.cart.filter(i => i.id !== id); renderCart(); calcTotals(); }
function clearCart()    { S.cart = []; renderCart(); calcTotals(); }

function renderCart() {
  var body = document.getElementById('cartBody');
  if (!S.cart.length) {
    body.innerHTML = '<div class="cart-empty"><div class="ce-icon" style="font-size:2rem;opacity:.2">[ ]</div><div class="ce-t">Carrito vacio</div><div class="ce-s">Escanea o selecciona un producto</div></div>';
    return;
  }
  body.innerHTML = S.cart.map(function(i) {
    var em = i.emoji ? '<span>'+i.emoji+'</span>' : '';
    return '<div class="ci">'
      + '<div class="ci-em">'+(i.emoji||'[-]')+'</div>'
      + '<div class="ci-info"><div class="ci-nm">'+i.name+'</div><div class="ci-pr">'+eur(i.price)+' c/u</div></div>'
      + '<div class="ci-qty"><button class="qb" onclick="chQty(\''+i.id+'\',-1)">-</button><span class="qn">'+i.qty+'</span><button class="qb" onclick="chQty(\''+i.id+'\',1)">+</button></div>'
      + '<div class="ci-tot">'+eur(i.price*i.qty)+'</div>'
      + '<button class="ci-rm" onclick="rmFromCart(\''+i.id+'\')">x</button>'
      + '</div>';
  }).join('');
}

function calcTotals() {
  var sub  = S.cart.reduce((s,i) => s+i.price*i.qty, 0);
  var dp   = parseFloat(document.getElementById('discIn').value) || 0;
  var disc = sub*dp/100;
  var net  = sub-disc;
  var tax  = net*taxRate(S.co);
  var tot  = net+tax;
  document.getElementById('sumSub').textContent   = eur(sub);
  document.getElementById('sumDisc').textContent  = '-'+eur(disc);
  document.getElementById('sumTax').textContent   = eur(tax);
  document.getElementById('sumTotal').textContent = eur(tot);
  var taxLbl = document.getElementById('sumTaxLabel');
  if (taxLbl) taxLbl.textContent = taxLabel(S.co);
  calcChange();
}
function calcChange() {
  if (S.pay !== 'efectivo') return;
  var sub  = S.cart.reduce(function(s,i){ return s + i.price * i.qty; }, 0);
  var dp   = parseFloat(document.getElementById('discIn').value) || 0;
  var disc = sub * dp / 100;
  var net  = sub - disc;
  var tax  = net * taxRate(S.co);
  var tot  = net + tax;
  var rec  = parseFloat(document.getElementById('cashIn').value) || 0;
  var ch   = rec - tot;
  var el   = document.getElementById('changeOut');
  el.textContent = eur(Math.max(0, ch));
  el.style.color = ch >= 0 ? 'var(--green)' : 'var(--red)';
}
function setPay(m, btn) {
  S.pay = m;
  document.querySelectorAll('.pay-btn').forEach(function(b) { b.classList.remove('on'); });
  btn.classList.add('on');
  // Efectivo: mostrar cambio
  var cashBlock    = document.getElementById('cashBlock');
  var soporteBlock = document.getElementById('soporteBlock');
  if (cashBlock)    cashBlock.style.display    = (m === 'efectivo') ? 'flex' : 'none';
  // Wero / Datafono / RIB: mostrar bloque soporte comprobante
  if (soporteBlock) {
    var needsSoporte = ['wero','datafono','rib'].includes(m);
    soporteBlock.classList.toggle('hidden', !needsSoporte);
  }
}

async function checkout() {
  if (!S.cart.length) { toast('El carrito esta vacio', 'wrn'); return; }
  var sub  = S.cart.reduce((s,i) => s+i.price*i.qty, 0);
  var dp   = parseFloat(document.getElementById('discIn').value) || 0;
  var disc = sub*dp/100;
  var net  = sub-disc;
  var tax  = net*taxRate(S.co);
  var tot  = net+tax;
  if (S.pay === 'efectivo') {
    var rec = parseFloat(document.getElementById('cashIn').value);
    // Si el campo esta vacio, asumimos pago exacto
    if (isNaN(rec) || rec === 0) {
      document.getElementById('cashIn').value = tot.toFixed(2);
      rec = tot;
    }
    if (rec < tot - 0.001) { toast('Efectivo insuficiente', 'err'); return; }
  }
  var btn = document.querySelector('.btn-pay');
  btn.disabled = true; btn.textContent = 'Procesando...';
  try {
    var prods = DB.prods();
    for (var item of S.cart) {
      var p = prods.find(x => x.id === item.id);
      if (p) { p.stock -= item.qty; p.lastSale = new Date().toISOString(); await supa.update('productos', p.id, { stock:p.stock, last_sale:p.lastSale }); }
    }
    var clientId   = document.getElementById('cartClient').value;
    var clientName = clientId ? (DB.clients().find(c => c.id===clientId)?.name||'Generico') : 'Generico';
    var invNum = makeInvNum();
    var v = { id:uid(), invNum, co:S.co, clientId, clientName, items:S.cart.map(i=>({...i})),
      sub, disc, dp, tax, tot, pay:S.pay,
      vendedor: getVendedor(),
      nota: getNotaVenta(),
      cashRec: S.pay==='efectivo' ? parseFloat(document.getElementById('cashIn').value)||0 : null,
      ts: new Date().toISOString() };
    await save.venta(v);
    // Crear soporte de pago para metodos electronicos
    var fotoParaSoporte = window._soporteCartData || S._fotoData || null;
    if (['wero','datafono','rib'].includes(S.pay)) {
      await crearSoporteVenta(v, fotoParaSoporte);
    } else if (S._fotoData && !['efectivo','credito'].includes(S.pay)) {
      await crearSoporteVenta(v, S._fotoData);
    }
    // Si es credito, crear deuda
    if (S.pay === 'credito') {
      await crearDeuda(v, S._fotoData || null);
      toast('Deuda registrada para ' + clientName, 'wrn');
    }
    // Limpiar foto y soporte
    S._fotoData = null;
    quitarSoporteCart();
    var fotoInd = document.getElementById('fotoIndicator');
    if (fotoInd) fotoInd.style.display = 'none';
    if (clientId) {
      var c = DB.clients().find(x => x.id===clientId);
      if (c) { c.totalBuy=(c.totalBuy||0)+tot; c.lastBuy=new Date().toISOString(); await supa.update('clientes', c.id, { total_buy:c.totalBuy, last_buy:c.lastBuy }); }
    }
    await trace('venta', S.co, 'Venta '+invNum+' - '+clientName, S.cart.length+' productos - '+eur(tot)+' - '+S.pay);
    burst();
    var copy = {...v, items:[...v.items]};
    clearCart(); document.getElementById('discIn').value=0; document.getElementById('cashIn').value=''; calcTotals();
    toast('Venta '+invNum+' - '+eur(tot), 'ok');
    setTimeout(() => showInvoice(copy), 350);
  } catch(e) { toast('Error: '+e.message, 'err'); console.error(e); }
  finally { btn.disabled=false; btn.textContent='COBRAR'; }
}

function makeInvNum() {
  var pf = S.co==='sol'?'SL':'SP';
  var yr = new Date().getFullYear();
  var n  = DB.ventas().filter(v=>v.co===S.co).length+1;
  return pf+'-'+yr+'-'+String(n).padStart(4,'0');
}

function burst() {
  var btn = document.querySelector('.btn-pay');
  if (!btn) return;
  var r = btn.getBoundingClientRect();
  var cx=r.left+r.width/2, cy=r.top+r.height/2;
  var cols=['#F97316','#FCD34D','#10B981','#3B82F6','#EC4899'];
  var wrap=document.createElement('div'); wrap.className='burst'; document.body.appendChild(wrap);
  for (var i=0;i<20;i++) {
    var pt=document.createElement('div'); pt.className='pt';
    var sz=Math.random()*10+4, ang=Math.random()*360, d=Math.random()*130+40;
    var tx=Math.cos(ang*Math.PI/180)*d, ty=Math.sin(ang*Math.PI/180)*d;
    pt.style.cssText='left:'+cx+'px;top:'+cy+'px;width:'+sz+'px;height:'+sz+'px;background:'+cols[~~(Math.random()*cols.length)]+';--tx:'+tx+'px;--ty:'+ty+'px;';
    wrap.appendChild(pt);
  }
  setTimeout(() => wrap.remove(), 1000);
}

var curInvoice = null;
function showInvoice(v) {
  curInvoice = v;
  var isLic = v.co==='lic';
  var coName = isLic ? 'Licores San Pedro' : 'El Sol Latino';
  var slogan = isLic ? 'Licor - Rumba - Snacks' : 'Pequenos placeres, grandes momentos!';
  var col    = isLic ? '#1D4ED8' : '#F97316';
  var col2   = isLic ? '#EAB308' : '#FCD34D';
  var logo   = isLic ? 'LOGO LICORES SAN PEDRO PNG.png' : 'LOGO EL SOL LATINO.PNG';
  var foot   = isLic ? S.cfg.footLic : S.cfg.footSol;
  var change = v.cashRec ? v.cashRec - v.tot : 0;

  var igHandle = isLic ? '@LICORES_SAN_PEDRO' : '@EL.SOL.LATINO';

  document.getElementById('invoice-box').innerHTML =
    '<div style="font-family:Inter,sans-serif;color:#111;max-width:500px;margin:0 auto;">'
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:1.5rem;border-radius:12px 12px 0 0;text-align:center;">'
    +'<img src="'+logo+'" style="width:68px;height:68px;object-fit:contain;margin-bottom:.4rem;" alt=""/>'
    +'<div style="font-size:1.3rem;font-weight:800;">'+coName+'</div>'
    +'<div style="font-size:.75rem;opacity:.85;margin-top:.15rem;">'+slogan+'</div></div>'
    +'<div style="background:#F9FAFB;padding:.8rem 1.2rem;display:flex;justify-content:space-between;">'
    +'<div><div style="font-size:.6rem;text-transform:uppercase;color:#9CA3AF;font-weight:600;">Factura</div>'
    +'<div style="font-size:1rem;font-weight:800;color:'+col+';">'+v.invNum+'</div></div>'
    +'<div style="text-align:right;font-size:.73rem;color:#6B7280;"><div>'+dtFull(v.ts)+'</div><div>Cliente: <strong>'+v.clientName+'</strong></div></div></div>'
    +'<div style="padding:1rem 1.2rem;background:#fff;">'
    +'<table style="width:100%;border-collapse:collapse;">'
    +'<thead><tr style="border-bottom:2px solid '+col+';">'
    +'<th style="text-align:left;padding:.3rem 0;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Producto</th>'
    +'<th style="text-align:center;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Cant.</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">P.Unit</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Total</th>'
    +'</tr></thead><tbody>'
    + v.items.map(function(i){ return '<tr style="border-bottom:1px solid #F3F4F6;">'
      +'<td style="padding:.42rem 0;font-size:.78rem;font-weight:500;">'+(i.emoji||'')+' '+i.name+'</td>'
      +'<td style="padding:.42rem 0;text-align:center;font-size:.78rem;">x'+i.qty+'</td>'
      +'<td style="padding:.42rem 0;text-align:right;font-size:.78rem;">'+eur(i.price)+'</td>'
      +'<td style="padding:.42rem 0;text-align:right;font-size:.78rem;font-weight:600;">'+eur(i.price*i.qty)+'</td>'
      +'</tr>'; }).join('')
    +'</tbody></table></div>'
    +'<div style="background:#F9FAFB;padding:.8rem 1.2rem;border-top:2px dashed #E5E7EB;">'
    +'<div style="display:flex;justify-content:space-between;font-size:.76rem;color:#6B7280;margin-bottom:.22rem;"><span>Subtotal</span><span>'+eur(v.sub)+'</span></div>'
    +(v.disc>0?'<div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:.22rem;"><span>Descuento ('+v.dp+'%)</span><span style="color:#10B981;">-'+eur(v.disc)+'</span></div>':'')
    +'<div style="display:flex;justify-content:space-between;font-size:.7rem;color:#9CA3AF;margin-bottom:.22rem;"><span>'+taxLabel(v.co)+'</span><span>'+eur(v.tax)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;padding-top:.45rem;border-top:2px solid #E5E7EB;color:'+col+';"><span>TOTAL</span><span>'+eur(v.tot)+'</span></div>'
    +(v.pay==='efectivo'&&v.cashRec?'<div style="display:flex;justify-content:space-between;font-size:.74rem;color:#9CA3AF;margin-top:.28rem;"><span>Efectivo</span><span>'+eur(v.cashRec)+'</span></div><div style="display:flex;justify-content:space-between;font-size:.88rem;font-weight:700;color:#10B981;"><span>Cambio</span><span>'+eur(change)+'</span></div>':'')
    +'<div style="margin-top:.45rem;"><span style="font-size:.62rem;color:#9CA3AF;">Pago: </span><span style="font-size:.7rem;font-weight:700;padding:.1rem .38rem;border-radius:100px;background:'+col+'1A;color:'+col+';">'+v.pay.toUpperCase()+'</span></div>'
    +(v.vendedor&&v.vendedor!=='Sin especificar'?'<div style="margin-top:.3rem;font-size:.68rem;color:#9CA3AF;">Vendedor: <strong style="color:#6B7280;">'+v.vendedor+'</strong></div>':'')
    +(v.nota?'<div style="margin-top:.25rem;font-size:.68rem;color:#9CA3AF;">Nota: <em style="color:#6B7280;">'+v.nota+'</em></div>':'')
    +'</div>'
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:1rem 1.2rem;border-radius:0 0 12px 12px;text-align:center;">'
    +'<div style="font-size:.8rem;font-weight:600;">'+foot+'</div>'
    +'<div style="display:inline-flex;align-items:center;gap:.35rem;margin-top:.55rem;background:rgba(255,255,255,.15);border-radius:100px;padding:.28rem .75rem;">'
    +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
    +'<span style="font-size:.72rem;font-weight:700;letter-spacing:.3px;">'+igHandle+'</span>'
    +'</div>'
    +'<div style="font-size:.58rem;opacity:.55;margin-top:.4rem;">Sistema POS - Sol Latino &amp; Licores San Pedro</div>'
    +'</div></div>';

  document.getElementById('mInvoice').classList.remove('hidden');
}
function closeInvoice() { document.getElementById('mInvoice').classList.add('hidden'); }
function printInvoice() {
  var html = document.getElementById('invoice-box').innerHTML;
  var w = window.open('','_blank','width=580,height=820');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:Inter,sans-serif;margin:0;padding:1rem;}@page{margin:1cm;}</style></head><body>'+html+'</body></html>');
  w.document.close(); w.onload=()=>w.print();
}
async function dlPDF() {
  var v = curInvoice;
  if (!v) return;

  // Necesitamos html2canvas y jsPDF
  if (!window.html2canvas || !window.jspdf) {
    printInvoice();
    toast('Generando PDF via impresión...', 'inf');
    return;
  }

  var btn = document.querySelector('.modal-ft .btn-pri');
  var origTxt = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }

  try {
    var box = document.getElementById('invoice-box');

    // Expandir el box para capturar todo sin recortar
    box.classList.add('capturing');

    // Esperar un frame para que el layout se recalcule
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Capturar el div tal como se ve, a doble resolución para nitidez
    var canvas = await html2canvas(box, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: box.scrollWidth,
      height: box.scrollHeight,
      windowWidth: box.scrollWidth,
      windowHeight: box.scrollHeight
    });

    // Restaurar
    box.classList.remove('capturing');

    var imgData = canvas.toDataURL('image/png');

    var { jsPDF } = window.jspdf;

    // Calcular dimensiones: ajustar el PDF al ancho del contenido capturado
    var pxW = canvas.width;
    var pxH = canvas.height;
    var ratio = pxH / pxW;

    // Ancho del PDF en mm (A5 ancho = 148mm, dejamos márgenes)
    var pdfW = 148;
    var pdfH = Math.round(pdfW * ratio);

    // Si es muy largo, usamos A4
    if (pdfH > 297) { pdfW = 210; pdfH = Math.round(pdfW * ratio); }

    var doc = new jsPDF({
      unit: 'mm',
      format: [pdfW, pdfH],
      orientation: 'portrait'
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    doc.save('Factura_' + v.invNum + '.pdf');
    toast('PDF guardado', 'ok');

  } catch (e) {
    console.error('dlPDF:', e);
    document.getElementById('invoice-box').classList.remove('capturing');
    toast('Error generando PDF, usando impresión', 'wrn');
    printInvoice();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origTxt; }
  }
}

function renderProdsTable() {
  var srch = (document.getElementById('pSrch')?.value||'').toLowerCase();
  var coF  = document.getElementById('pCoF')?.value||'all';
  var catF = document.getElementById('pCatF')?.value||'all';
  var prods = DB.prods().filter(p => (!srch||p.name.toLowerCase().includes(srch)||p.bc.includes(srch)) && (coF==='all'||p.co===coF) && (catF==='all'||p.cat===catF));
  var tb = document.getElementById('prodsTbody');
  if (!prods.length) { tb.innerHTML='<tr><td colspan="12" style="text-align:center;padding:2rem;color:var(--text-3)">Sin productos</td></tr>'; return; }
  tb.innerHTML = prods.map(function(p) {
    var sc=p.stock<=0?'tag-out':p.stock<=p.min?'tag-low':'tag-ok';
    var sl=p.stock<=0?'Sin stock':p.stock<=p.min?'Stock bajo':'Optimo';
    var margen = p.cost>0 ? Math.round(((p.price-p.cost)/p.price)*100) : null;
    var mc = margen!==null ? (margen>=30?'var(--green)':margen>=15?'var(--amber)':'var(--red)') : 'var(--text-3)';
    return '<tr>'
      +'<td style="font-family:DM Mono,monospace;font-size:.7rem;">'+p.bc+'</td>'
      +'<td><strong>'+(p.emoji?p.emoji+' ':'')+p.name+'</strong></td>'
      +'<td>'+p.cat+'</td>'
      +'<td><span class="tag tag-'+p.co+'">'+(p.co==='sol'?'Sol Latino':'San Pedro')+'</span></td>'
      +'<td style="font-weight:700;color:var(--accent);font-family:DM Mono,monospace;">'+eur(p.price)+'</td>'
      +'<td style="font-family:DM Mono,monospace;color:var(--text-3);">'+(p.cost?eur(p.cost):'-')+'</td>'
      +'<td style="font-weight:700;color:'+mc+';font-family:DM Mono,monospace;">'+(margen!==null?margen+'%':'-')+'</td>'
      +'<td style="font-weight:600;">'+p.stock+'</td>'
      +'<td>'+p.min+'</td>'
      +'<td>'+(p.fechaVenc?buildVencTag(p):'<span style="font-size:.7rem;color:var(--text-3);">-</span>')+'</td>'
      +'<td><span class="tag '+sc+'">'+sl+'</span></td>'
      +'<td><div class="acts">'
      +'<button class="act e" onclick="openProdModal(\''+p.id+'\')">Editar</button>'
      +'<button class="act s" onclick="openStockModal(\''+p.id+'\')">Stock</button>'
      +'<button class="act d" onclick="delProd(\''+p.id+'\')">Borrar</button>'
      +'</div></td></tr>';
  }).join('');
}

function openProdModal(id) {
  S.editProd = id || null;
  document.getElementById('mProdTitle').textContent = id ? 'Editar producto' : 'Nuevo producto';
  if (id) {
    var p = DB.prods().find(x => x.id===id);
    if (p) {
      document.getElementById('pCo').value=p.co; document.getElementById('pBC').value=p.bc;
      document.getElementById('pName').value=p.name; document.getElementById('pCat').value=p.cat;
      document.getElementById('pPrice').value=p.price; document.getElementById('pCost').value=p.cost||'';
      document.getElementById('pStock').value=p.stock; document.getElementById('pMin').value=p.min;
      document.getElementById('pDesc').value=p.desc||''; document.getElementById('pEmoji').value=p.emoji||'';
      document.getElementById('pFechaVenc').value=p.fechaVenc||'';
      document.getElementById('pDiasAlerta').value=p.diasAlerta||7;
      document.getElementById('pLote').value=p.lote||'';
    }
  } else {
    document.getElementById('pCo').value=S.co; document.getElementById('pBC').value='20'+Date.now().toString().slice(-10);
    document.getElementById('pName').value=''; document.getElementById('pCat').value='bebidas';
    document.getElementById('pPrice').value=''; document.getElementById('pCost').value='';
    document.getElementById('pStock').value='0'; document.getElementById('pMin').value='5';
    document.getElementById('pDesc').value=''; document.getElementById('pEmoji').value='';
    document.getElementById('pFechaVenc').value='';
    document.getElementById('pDiasAlerta').value='7';
    document.getElementById('pLote').value='';
  }
  document.getElementById('mProd').classList.remove('hidden');
}
function closeProdModal() { document.getElementById('mProd').classList.add('hidden'); S.editProd=null; }
function setEm(e) { document.getElementById('pEmoji').value=e; }

async function saveProd() {
  var name=document.getElementById('pName').value.trim();
  var bc=document.getElementById('pBC').value.trim();
  var price=parseFloat(document.getElementById('pPrice').value);
  if (!name) { toast('Nombre obligatorio','err'); return; }
  if (!bc)   { toast('Codigo obligatorio','err'); return; }
  if (isNaN(price)||price<0) { toast('Precio no valido','err'); return; }
  var pCo = document.getElementById('pCo').value;
  var dup = DB.prods().find(p => p.bc===bc && p.co===pCo && p.id!==S.editProd);
  if (dup) { console.warn('Duplicado encontrado:', JSON.stringify(dup)); toast('Codigo duplicado: "'+dup.name+'" ya usa ese codigo','err'); return; }
  var btn = document.querySelector('#mProd .btn-pri');
  btn.disabled=true; btn.textContent='Guardando...';
  var data = { id:S.editProd||uid(), co:document.getElementById('pCo').value, bc, name,
    cat:document.getElementById('pCat').value, price,
    cost:parseFloat(document.getElementById('pCost').value)||0,
    stock:parseInt(document.getElementById('pStock').value)||0,
    min:parseInt(document.getElementById('pMin').value)||5,
    desc:document.getElementById('pDesc').value,
    emoji:document.getElementById('pEmoji').value,
    fechaVenc:document.getElementById('pFechaVenc').value||null,
    diasAlerta:parseInt(document.getElementById('pDiasAlerta').value)||7,
    lote:document.getElementById('pLote').value||null,
    createdAt:S.editProd?(DB.prods().find(p=>p.id===S.editProd)?.createdAt||new Date().toISOString()):new Date().toISOString() };
  try {
    await save.prod(data);
    await trace('producto', data.co, (S.editProd?'Editado':'Creado')+': '+name, 'Precio: '+eur(price));
    toast(S.editProd?'Producto actualizado':'Producto creado','ok');
    closeProdModal(); renderProdsTable(); renderProdGrid();
  } catch(e) { toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='Guardar'; }
}

async function delProd(id) {
  if (!confirm('Eliminar este producto?')) return;
  try { await save.deleteProd(id); renderProdsTable(); renderProdGrid(); toast('Eliminado','ok'); }
  catch(e) { toast('Error: '+e.message,'err'); }
}

function renderStockTable() {
  var srch=(document.getElementById('sSrch')?.value||'').toLowerCase();
  var coF=document.getElementById('sCoF')?.value||'all';
  var stF=document.getElementById('sStF')?.value||'all';
  var all=DB.prods();
  document.getElementById('ssOk').textContent=all.filter(p=>p.stock>p.min).length;
  document.getElementById('ssLow').textContent=all.filter(p=>p.stock>0&&p.stock<=p.min).length;
  document.getElementById('ssZero').textContent=all.filter(p=>p.stock<=0).length;
  document.getElementById('ssVal').textContent=eur(all.reduce((s,p)=>s+p.stock*(p.cost||p.price),0));
  var prods=all.filter(p=>{
    var ms=!srch||p.name.toLowerCase().includes(srch)||p.bc.includes(srch);
    var mc=coF==='all'||p.co===coF;
    var mx=true;
    if(stF==='ok')mx=p.stock>p.min; else if(stF==='low')mx=p.stock>0&&p.stock<=p.min; else if(stF==='zero')mx=p.stock<=0; else if(stF==='venc'){if(!p.fechaVenc){mx=false;}else{var dv=new Date(p.fechaVenc),hv=new Date();mx=Math.ceil((dv-hv)/(864e5))<=(p.diasAlerta||7);}}
    return ms&&mc&&mx;
  });
  var tb=document.getElementById('stockTbody');
  if(!prods.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-3)">Sin resultados</td></tr>';return;}
  tb.innerHTML=prods.map(p=>{
    var sc=p.stock<=0?'tag-out':p.stock<=p.min?'tag-low':'tag-ok';
    var sl=p.stock<=0?'Sin stock':p.stock<=p.min?'Bajo':'Optimo';
    var lm=p.lastMovement||p.updatedAt||p.createdAt;
    return '<tr><td style="font-family:DM Mono,monospace;font-size:.7rem;">'+p.bc+'</td>'
      +'<td><strong>'+(p.emoji||'')+' '+p.name+'</strong></td>'
      +'<td><span class="tag tag-'+p.co+'">'+(p.co==='sol'?'SL':'SP')+'</span></td>'
      +'<td style="font-size:.95rem;font-weight:800;color:'+(p.stock<=0?'var(--red)':p.stock<=p.min?'var(--amber)':'var(--green)')+';">'+p.stock+'</td>'
      +'<td>'+p.min+'</td><td>'+eur(p.stock*(p.cost||p.price))+'</td>'
      +'<td><span class="tag '+sc+'">'+sl+'</span></td>'
      +'<td style="font-size:.7rem;color:var(--text-3);">'+(p.fechaVenc?buildVencTag(p):'-')+'</td>'
      +'<td style="font-size:.7rem;color:var(--text-3);">'+(p.lote||'-')+'</td>'
      +'<td style="font-size:.7rem;color:var(--text-3);">'+(lm?dtShort(lm):'-')+'</td>'
      +'<td><button class="act s" onclick="openStockModal(\''+p.id+'\')">Ajustar</button></td></tr>';
  }).join('');
}

function openStockModal(pid) {
  var prods=DB.prods();
  var sel=document.getElementById('sProd');
  sel.innerHTML='<option value="">Selecciona...</option>'+prods.map(p=>'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+p.name+' ('+(p.co==='sol'?'Sol':'San Pedro')+')</option>').join('');
  document.getElementById('sQty').value=''; document.getElementById('sReason').value='';
  updateStockCur(); document.getElementById('mStock').classList.remove('hidden');
}
function closeStockModal() { document.getElementById('mStock').classList.add('hidden'); }
function updateStockCur() {
  var id=document.getElementById('sProd').value;
  var p=DB.prods().find(x=>x.id===id);
  document.getElementById('sCur').value=p?p.stock:'';
}
async function saveStockAdj() {
  var id=document.getElementById('sProd').value;
  if(!id){toast('Selecciona un producto','err');return;}
  var qty=parseInt(document.getElementById('sQty').value);
  if(isNaN(qty)||qty<0){toast('Cantidad no valida','err');return;}
  var type=document.getElementById('sType').value;
  var reason=document.getElementById('sReason').value||'Sin motivo';
  var prods=DB.prods(); var idx=prods.findIndex(p=>p.id===id); if(idx===-1)return;
  var prev=prods[idx].stock;
  if(type==='entrada')prods[idx].stock+=qty;
  else if(type==='salida')prods[idx].stock=Math.max(0,prods[idx].stock-qty);
  else prods[idx].stock=qty;
  prods[idx].lastMovement=new Date().toISOString();
  try {
    await supa.update('productos', id, {stock:prods[idx].stock,last_movement:prods[idx].lastMovement});
    await trace(type==='entrada'?'stock_in':type==='salida'?'stock_out':'ajuste', prods[idx].co,
      (type==='entrada'?'Entrada':type==='salida'?'Salida':'Ajuste')+': '+prods[idx].name,
      prev+' -> '+prods[idx].stock+' - '+reason);
    toast('Stock: '+prev+' -> '+prods[idx].stock,'ok');
    closeStockModal(); renderStockTable(); renderProdGrid();
  } catch(e){toast('Error: '+e.message,'err');}
}

function renderVentasTable() {
  var df=document.getElementById('vFrom')?.value;
  var dt=document.getElementById('vTo')?.value;
  var cf=document.getElementById('vCoF')?.value||'all';
  var mf=document.getElementById('vMF')?.value||'all';
  var ventas=DB.ventas().filter(v=>{
    var d=new Date(v.ts);
    return (cf==='all'||v.co===cf)&&(mf==='all'||v.pay===mf)&&(!df||d>=new Date(df))&&(!dt||d<=new Date(dt+'T23:59:59'));
  });
  var tb=document.getElementById('ventasTbody');
  if(!ventas.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-3)">Sin ventas</td></tr>';return;}
  tb.innerHTML=ventas.map(v=>'<tr>'
    +'<td style="font-family:DM Mono,monospace;font-size:.7rem;">'+v.invNum+'</td>'
    +'<td>'+dtFull(v.ts)+'</td>'
    +'<td><span class="tag tag-'+v.co+'">'+(v.co==='sol'?'Sol Latino':'San Pedro')+'</span></td>'
    +'<td>'+v.clientName+'</td>'
    +'<td style="font-size:.7rem;color:var(--text-3);">'+(v.vendedor&&v.vendedor!=='Sin especificar'?v.vendedor:'-')+'</td>'
    +'<td style="font-size:.7rem;color:var(--text-3);">'+v.items.length+' prod.</td>'
    +'<td><span style="font-size:.7rem;padding:.1rem .38rem;border-radius:100px;background:var(--bg);">'+v.pay+'</span></td>'
    +'<td style="font-weight:700;color:var(--green);font-family:DM Mono,monospace;">'+eur(v.tot)+'</td>'
    +'<td><button class="act v" onclick="showSaleInv(\''+v.id+'\')">Ver</button></td></tr>').join('');
}
function showSaleInv(id){var v=DB.ventas().find(x=>x.id===id);if(v)showInvoice(v);}
function exportCSV(){
  var rows=[['Factura','Fecha','Empresa','Cliente','Productos','Total','Metodo']];
  DB.ventas().forEach(v=>rows.push([v.invNum,dtFull(v.ts),v.co==='sol'?'Sol Latino':'San Pedro',v.clientName,v.items.map(i=>i.name+'x'+i.qty).join('|'),v.tot.toFixed(2),v.pay]));
  var csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download='ventas_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  toast('CSV exportado','ok');
}

function renderClientsTable() {
  var srch=(document.getElementById('cSrch')?.value||'').toLowerCase();
  var cl=DB.clients().filter(c=>!srch||c.name.toLowerCase().includes(srch)||(c.email||'').toLowerCase().includes(srch));
  var sel=document.getElementById('cartClient');
  if(sel){var cur=sel.value;sel.innerHTML='<option value="">Cliente generico</option>'+DB.clients().map(c=>'<option value="'+c.id+'"'+(c.id===cur?' selected':'')+'>'+c.name+'</option>').join('');}
  var tb=document.getElementById('clientsTbody');
  if(!cl.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Sin clientes</td></tr>';return;}
  tb.innerHTML=cl.map(c=>'<tr>'
    +'<td><strong>'+c.name+'</strong></td><td>'+(c.email||'-')+'</td><td>'+(c.phone||'-')+'</td>'
    +'<td style="font-weight:700;color:var(--green);font-family:DM Mono,monospace;">'+eur(c.totalBuy||0)+'</td>'
    +'<td>'+(c.lastBuy?dtShort(c.lastBuy):'Nunca')+'</td>'
    +'<td><div class="acts"><button class="act e" onclick="openClientModal(\''+c.id+'\')">Editar</button><button class="act d" onclick="delClient(\''+c.id+'\')">Borrar</button></div></td></tr>').join('');
}
function openClientModal(id){
  S.editClient=id||null;
  document.getElementById('mClientTitle').textContent=id?'Editar cliente':'Nuevo cliente';
  if(id){var c=DB.clients().find(x=>x.id===id);if(c){document.getElementById('cName').value=c.name;document.getElementById('cEmail').value=c.email||'';document.getElementById('cPhone').value=c.phone||'';document.getElementById('cNif').value=c.nif||'';document.getElementById('cAddr').value=c.addr||'';}}
  else{['cName','cEmail','cPhone','cNif','cAddr'].forEach(id=>document.getElementById(id).value='');}
  document.getElementById('mClient').classList.remove('hidden');
}
function closeClientModal(){document.getElementById('mClient').classList.add('hidden');S.editClient=null;}
async function saveClient(){
  var name=document.getElementById('cName').value.trim();
  if(!name){toast('Nombre obligatorio','err');return;}
  var data={id:S.editClient||uid(),name,email:document.getElementById('cEmail').value.trim(),phone:document.getElementById('cPhone').value.trim(),nif:document.getElementById('cNif').value.trim(),addr:document.getElementById('cAddr').value.trim(),totalBuy:S.editClient?(DB.clients().find(c=>c.id===S.editClient)?.totalBuy||0):0,createdAt:S.editClient?(DB.clients().find(c=>c.id===S.editClient)?.createdAt||new Date().toISOString()):new Date().toISOString()};
  try{await save.client(data);toast(S.editClient?'Cliente actualizado':'Cliente creado','ok');closeClientModal();renderClientsTable();}
  catch(e){toast('Error: '+e.message,'err');}
}
async function delClient(id){if(!confirm('Eliminar cliente?'))return;try{await save.deleteClient(id);renderClientsTable();toast('Eliminado','ok');}catch(e){toast('Error: '+e.message,'err');}}

function renderDash(){
  var ventas=DB.ventas(),prods=DB.prods(),cl=DB.clients();
  var now=new Date(),today=now.toISOString().slice(0,10),month=now.toISOString().slice(0,7);
  var fv=ventas.filter(v=>S.dashCo==='all'||v.co===S.dashCo);
  var hoy=fv.filter(v=>v.ts.startsWith(today));
  var mes=fv.filter(v=>v.ts.startsWith(month));
  document.getElementById('kHoy').textContent=eur(hoy.reduce((s,v)=>s+v.tot,0));
  document.getElementById('kHoySub').textContent=hoy.length+' transacciones';
  document.getElementById('kMes').textContent=eur(mes.reduce((s,v)=>s+v.tot,0));
  document.getElementById('kMesSub').textContent=mes.length+' ventas';
  document.getElementById('kProds').textContent=prods.length;
  document.getElementById('kProdsSub').textContent=prods.filter(p=>p.stock<=p.min).length+' con stock bajo';
  document.getElementById('kClients').textContent=cl.length;
  drawDayChart(fv);drawTopChart(fv);drawPayChart(fv);drawCoChart();drawAlerts();drawRecent();
}
function dashFilter(co,btn){
  S.dashCo=co;
  document.querySelectorAll('.chart-filter .cf-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); renderDash();
}

function drawDayChart(ventas){
  var labels=[],data=[];
  for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);var k=d.toISOString().slice(0,10);labels.push(d.toLocaleDateString('es-ES',{weekday:'short',day:'2-digit'}));data.push(ventas.filter(v=>v.ts.startsWith(k)).reduce((s,v)=>s+v.tot,0));}
  if(S.charts.days)S.charts.days.destroy();
  S.charts.days=new Chart(document.getElementById('chartDays').getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'Ventas',data,backgroundColor:'rgba(249,115,22,.12)',borderColor:'#F97316',borderWidth:2,borderRadius:8,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#9CA3AF',callback:v=>v+'e'},grid:{color:'rgba(0,0,0,.05)'},border:{display:false}},x:{ticks:{color:'#9CA3AF'},grid:{display:false},border:{display:false}}}}});
}
function drawTopChart(ventas){
  var c={};ventas.forEach(v=>v.items.forEach(i=>{c[i.name]=(c[i.name]||0)+i.qty;}));
  var s=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(S.charts.top)S.charts.top.destroy();
  S.charts.top=new Chart(document.getElementById('chartTop').getContext('2d'),{type:'bar',data:{labels:s.map(x=>x[0]),datasets:[{data:s.map(x=>x[1]),backgroundColor:['rgba(249,115,22,.8)','rgba(59,130,246,.8)','rgba(16,185,129,.8)','rgba(139,92,246,.8)','rgba(236,72,153,.8)'],borderRadius:6,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9CA3AF'},grid:{color:'rgba(0,0,0,.05)'},border:{display:false}},y:{ticks:{color:'#6B7280',font:{size:11}},grid:{display:false},border:{display:false}}}}});
}
function drawPayChart(ventas){
  var m={};ventas.forEach(v=>{m[v.pay]=(m[v.pay]||0)+v.tot;});
  if(S.charts.pay)S.charts.pay.destroy();
  S.charts.pay=new Chart(document.getElementById('chartPay').getContext('2d'),{type:'doughnut',data:{labels:Object.keys(m),datasets:[{data:Object.values(m),backgroundColor:['#F97316','#3B82F6','#10B981','#F59E0B'],borderWidth:3,borderColor:'#FFFFFF',hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:true,cutout:'65%',plugins:{legend:{labels:{color:'#6B7280',boxWidth:10,font:{size:11},padding:12}}}}});
}
function drawCoChart(){
  var sol=DB.ventas().filter(v=>v.co==='sol').reduce((s,v)=>s+v.tot,0);
  var lic=DB.ventas().filter(v=>v.co==='lic').reduce((s,v)=>s+v.tot,0);
  if(S.charts.co)S.charts.co.destroy();
  S.charts.co=new Chart(document.getElementById('chartCo').getContext('2d'),{type:'pie',data:{labels:['Sol Latino','San Pedro'],datasets:[{data:[sol,lic],backgroundColor:['#F97316','#1D4ED8'],borderWidth:3,borderColor:'#FFFFFF',hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:'#6B7280',boxWidth:10,font:{size:11},padding:12}}}}});
}
function drawAlerts(){
  var low=DB.prods().filter(p=>p.stock<=p.min).sort((a,b)=>a.stock-b.stock);
  var c=document.getElementById('alertsList');
  if(!low.length){c.innerHTML='<div style="color:var(--text-3);font-size:.78rem;padding:.4rem">Todo el stock esta en orden</div>';return;}
  c.innerHTML=low.slice(0,10).map(p=>'<div class="alert-row '+(p.stock<=0?'r':'w')+'">'
    +'<span class="ar-nm">'+p.name+'</span>'
    +'<span class="tag tag-'+p.co+'" style="font-size:.6rem">'+(p.co==='sol'?'SL':'SP')+'</span>'
    +'<span class="ar-st '+(p.stock<=0?'r':'w')+'">Stock: '+p.stock+'</span></div>').join('');
}
function drawRecent(){
  var c=document.getElementById('recentList');
  var vs=DB.ventas().slice(0,8);
  if(!vs.length){c.innerHTML='<div style="color:var(--text-3);font-size:.78rem;padding:.4rem">Sin ventas aun</div>';return;}
  c.innerHTML=vs.map(v=>'<div class="recent-row"><span class="rr-time">'+tFmt(v.ts)+'</span>'
    +'<span class="rr-co '+v.co+'">'+(v.co==='sol'?'SL':'SP')+'</span>'
    +'<span class="rr-desc">'+v.invNum+' - '+v.clientName+'</span>'
    +'<span class="rr-tot">'+eur(v.tot)+'</span></div>').join('');
}

function loadCfgUI(){
  document.getElementById('cfgFootSol').value=S.cfg.footSol;
  document.getElementById('cfgFootLic').value=S.cfg.footLic;
  document.getElementById('cfgCo').value=S.co;
}
async function saveConfig(){
  try{await save.cfg('footSol',document.getElementById('cfgFootSol').value);await save.cfg('footLic',document.getElementById('cfgFootLic').value);toast('Guardado','ok');}
  catch(e){toast('Error: '+e.message,'err');}
}
function exportData(){
  var data={prods:DB.prods(),ventas:DB.ventas(),clients:DB.clients(),traces:DB.traces(),cfg:S.cfg,ts:new Date().toISOString()};
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='backup_pos_'+new Date().toISOString().slice(0,10)+'.json';a.click();toast('Backup exportado','ok');
}
async function clearAll(){
  if(!confirm('Borrar TODOS los datos?'))return;
  if(!confirm('Seguro? No hay vuelta atras.'))return;
  try{await Promise.all([fetch(SUPA_URL+'/rest/v1/productos?id=neq.null',{method:'DELETE',headers:supa._h}),fetch(SUPA_URL+'/rest/v1/ventas?id=neq.null',{method:'DELETE',headers:supa._h}),fetch(SUPA_URL+'/rest/v1/clientes?id=neq.null',{method:'DELETE',headers:supa._h}),fetch(SUPA_URL+'/rest/v1/trazas?id=neq.null',{method:'DELETE',headers:supa._h})]);S._prods=[];S._ventas=[];S._clients=[];S._traces=[];renderProdGrid();renderProdsTable();renderStockTable();renderVentasTable();renderClientsTable();toast('Datos borrados','wrn');}catch(e){toast('Error: '+e.message,'err');}
}

async function loadDemo(){
  if(DB.prods().length>0&&!confirm('Ya hay productos. Agregar igualmente?'))return;
  var btn=document.querySelector('[onclick="loadDemo()"]');if(btn){btn.disabled=true;btn.textContent='Cargando...';}
  var sp=[
    {id:uid(),co:'sol',bc:'2000000000001',name:'Coca-Cola 33cl',cat:'bebidas',price:1.50,cost:.80,stock:48,min:10,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000002',name:'Agua Mineral 50cl',cat:'bebidas',price:.80,cost:.30,stock:100,min:20,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000003',name:'Fanta Naranja 33cl',cat:'bebidas',price:1.50,cost:.80,stock:36,min:10,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000004',name:'Cafe Solo',cat:'bebidas',price:1.20,cost:.40,stock:200,min:30,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000005',name:'Patatas Fritas 150g',cat:'snacks',price:1.80,cost:.90,stock:24,min:8,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000006',name:'Chocolate 100g',cat:'snacks',price:1.50,cost:.75,stock:18,min:5,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000007',name:'Bocadillo Mixto',cat:'comida',price:3.50,cost:1.80,stock:8,min:3,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000008',name:'Zumo Natural 25cl',cat:'bebidas',price:2.20,cost:1.20,stock:15,min:5,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000009',name:'Te Verde 50cl',cat:'bebidas',price:1.30,cost:.60,stock:3,min:5,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'sol',bc:'2000000000010',name:'Croissant Mantequilla',cat:'comida',price:1.80,cost:.90,stock:0,min:5,emoji:'',desc:'',createdAt:new Date().toISOString()},
  ];
  var lp=[
    {id:uid(),co:'lic',bc:'3000000000001',name:'Ron Barcelo Imperial',cat:'licores',price:18.90,cost:11.00,stock:12,min:3,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000002',name:'Whisky Jack Daniels',cat:'licores',price:22.50,cost:14.00,stock:8,min:2,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000003',name:'Cerveza Heineken 33cl',cat:'bebidas',price:1.80,cost:.90,stock:72,min:24,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000004',name:'Vino Tinto Rioja 75cl',cat:'licores',price:8.50,cost:4.50,stock:15,min:4,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000005',name:'Vodka Absolut 70cl',cat:'licores',price:16.90,cost:10.00,stock:6,min:2,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000006',name:'Sangria 1L',cat:'licores',price:5.50,cost:2.80,stock:20,min:5,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000007',name:'Mahou 33cl',cat:'bebidas',price:1.60,cost:.80,stock:48,min:12,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000008',name:'Pistachos 200g',cat:'snacks',price:4.50,cost:2.20,stock:10,min:3,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000009',name:'Chupitos Caja 6u',cat:'licores',price:3.50,cost:1.80,stock:2,min:3,emoji:'',desc:'',createdAt:new Date().toISOString()},
    {id:uid(),co:'lic',bc:'3000000000010',name:'Gin Tanqueray 70cl',cat:'licores',price:19.90,cost:12.00,stock:5,min:2,emoji:'',desc:'',createdAt:new Date().toISOString()},
  ];
  try{
    await supa.insert('productos',[...sp,...lp].map(toDBProd));
    S._prods.push(...sp,...lp);
    var ventas=[],all=[...sp,...lp];
    for(var i=0;i<22;i++){
      var isLic=Math.random()>.5,pool=isLic?lp:sp;
      var d=new Date();d.setDate(d.getDate()-Math.floor(Math.random()*7));d.setHours(Math.floor(Math.random()*12)+8);
      var items=[];
      for(var j=0;j<Math.floor(Math.random()*3)+1;j++){var p=pool[~~(Math.random()*pool.length)];items.push({id:p.id,name:p.name,price:p.price,qty:~~(Math.random()*3)+1,emoji:''});}
      var sub=items.reduce((s,i)=>s+i.price*i.qty,0),tax=sub*.21,tot=sub+tax;
      var pays=['efectivo','tarjeta','bizum'];
      ventas.push({id:uid(),invNum:(isLic?'SP':'SL')+'-2024-'+String(ventas.length+1).padStart(4,'0'),co:isLic?'lic':'sol',clientId:null,clientName:'Generico',items,sub,disc:0,dp:0,tax,tot,pay:pays[~~(Math.random()*pays.length)],cashRec:null,ts:d.toISOString()});
    }
    await supa.insert('ventas',ventas.map(toDBVenta));
    S._ventas.unshift(...ventas);
    if(!DB.clients().length){
      var cls=[{id:uid(),name:'Maria Garcia',email:'maria@ejemplo.com',phone:'+34 611 111 111',nif:'12345678A',addr:'Calle Mayor 1',totalBuy:145.50,lastBuy:new Date().toISOString(),createdAt:new Date().toISOString()},{id:uid(),name:'Carlos Lopez',email:'carlos@ejemplo.com',phone:'+34 622 222 222',nif:'87654321B',addr:'Av. Libertad 23',totalBuy:89.30,lastBuy:new Date().toISOString(),createdAt:new Date().toISOString()}];
      await supa.insert('clientes',cls.map(toDBClient));S._clients.push(...cls);
    }
    await trace('ajuste','sol','Demo cargada en Supabase','Productos y ventas de ejemplo');
    renderProdGrid();renderProdsTable();renderStockTable();renderClientsTable();renderVentasTable();
    toast('Demo cargada!','ok');
  }catch(e){toast('Error: '+e.message,'err');console.error(e);}
  finally{if(btn){btn.disabled=false;btn.textContent='Cargar datos de demostracion';}}
}

async function init(){
  tickClock(); setInterval(tickClock,1000);
  document.getElementById('cashBlock').style.display='flex';
  // Handle PWA shortcuts (?section=xxx)
  var urlParams = new URLSearchParams(window.location.search);
  var startSection = urlParams.get('section') || 'pos';
  var today=new Date().toISOString().slice(0,10);
  var ago30=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  if(document.getElementById('vFrom'))document.getElementById('vFrom').value=ago30;
  if(document.getElementById('vTo'))document.getElementById('vTo').value=today;

  setTimeout(async function(){
    var splash=document.getElementById('splash');
    document.querySelector('.sp-hint').textContent='Conectando...';
    var ok=await DB.loadAll();
    if(!ok)toast('Error al cargar datos','err');
    setDbStatus(ok);
    await loadDeudas();
    await loadDevoluciones();
    document.querySelector('.sp-hint').textContent=ok?'Conectado!':'Error';
    setTimeout(function(){
      splash.classList.add('out');
      setTimeout(function(){
        splash.classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        renderProdGrid(); calcTotals(); renderClientsTable(); renderDash(); go(startSection);
      },500);
    },600);
  },1800);
}

//    PROFESSIONAL FEATURES                      

// Supabase connection indicator
function setDbStatus(ok) {
  var dot   = document.getElementById('dbDot');
  var label = document.getElementById('dbLabel');
  if (!dot) return;
  dot.style.background = ok ? '#10B981' : '#EF4444';
  if (label) {
    label.textContent = ok ? 'En linea' : 'Sin conexion';
    label.style.color = ok ? '#10B981'  : '#EF4444';
  }
}

// Vendedor helper
function getVendedor() {
  var el = document.getElementById('vendedorInput');
  return el ? el.value.trim() || 'Sin especificar' : 'Sin especificar';
}

// Nota de venta helper
function getNotaVenta() {
  var el = document.getElementById('notaVenta');
  return el ? el.value.trim() : '';
}

// Cierre de Caja
function showCierreCaja() {
  var now   = new Date();
  var today = now.toISOString().slice(0, 10);
  var ventas = DB.ventas().filter(function(v) { return v.ts.startsWith(today); });

  var totalEfectivo = ventas.filter(v=>v.pay==='efectivo').reduce((s,v)=>s+v.tot,0);
  var totalTarjeta  = ventas.filter(v=>v.pay==='tarjeta').reduce((s,v)=>s+v.tot,0);
  var totalBizum    = ventas.filter(v=>v.pay==='bizum').reduce((s,v)=>s+v.tot,0);
  var totalCredito  = ventas.filter(v=>v.pay==='credito').reduce((s,v)=>s+v.tot,0);
  var totalDia      = ventas.reduce((s,v)=>s+v.tot,0);

  var solVentas = ventas.filter(v=>v.co==='sol');
  var licVentas = ventas.filter(v=>v.co==='lic');
  var solTotal  = solVentas.reduce((s,v)=>s+v.tot,0);
  var licTotal  = licVentas.reduce((s,v)=>s+v.tot,0);

  var html = '<div style="display:flex;flex-direction:column;gap:.85rem;">'
    + '<div style="background:#F9FAFB;border-radius:8px;padding:.85rem;">'
    + '<div style="font-weight:700;color:#111;margin-bottom:.5rem;font-size:.85rem;">Resumen del dia - '+now.toLocaleDateString('es-ES',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem;">'
    + row('Total ventas', ventas.length+' ventas')
    + row('Importe total', eur(totalDia))
    + '</div></div>'

    + '<div style="background:#F9FAFB;border-radius:8px;padding:.85rem;">'
    + '<div style="font-weight:700;color:#111;margin-bottom:.5rem;font-size:.82rem;">Por metodo de pago</div>'
    + row2('Efectivo', eur(totalEfectivo), solVentas.filter(v=>v.pay==='efectivo').length+licVentas.filter(v=>v.pay==='efectivo').length+' ventas')
    + row2('Tarjeta',  eur(totalTarjeta),  ventas.filter(v=>v.pay==='tarjeta').length+' ventas')
    + row2('Bizum',    eur(totalBizum),     ventas.filter(v=>v.pay==='bizum').length+' ventas')
    + row2('Credito',  eur(totalCredito),   ventas.filter(v=>v.pay==='credito').length+' ventas')
    + '</div>'

    + '<div style="background:#F9FAFB;border-radius:8px;padding:.85rem;">'
    + '<div style="font-weight:700;color:#111;margin-bottom:.5rem;font-size:.82rem;">Por empresa</div>'
    + row2('Sol Latino',    eur(solTotal), solVentas.length+' ventas')
    + row2('San Pedro',     eur(licTotal), licVentas.length+' ventas')
    + '</div>'

    + '<div style="display:flex;justify-content:space-between;padding:.85rem;background:linear-gradient(135deg,#F97316,#FCD34D);border-radius:8px;color:#fff;">'
    + '<span style="font-weight:800;font-size:.9rem;">TOTAL DIA</span>'
    + '<span style="font-weight:800;font-size:1.1rem;font-family:DM Mono,monospace;">'+eur(totalDia)+'</span>'
    + '</div></div>';

  document.getElementById('cierreContent').innerHTML = html;
  document.getElementById('mCierre').classList.remove('hidden');
}

function row(label, value) {
  return '<div style="display:flex;justify-content:space-between;font-size:.78rem;padding:.2rem 0;">'
       + '<span style="color:#6B7280;">'+label+'</span><span style="font-weight:600;">'+value+'</span></div>';
}
function row2(label, value, sub) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;padding:.22rem 0;border-bottom:1px solid #E5E7EB;">'
       + '<span style="color:#374151;">'+label+'</span>'
       + '<div style="text-align:right;"><div style="font-weight:700;font-family:DM Mono,monospace;">'+value+'</div>'
       + '<div style="font-size:.65rem;color:#9CA3AF;">'+sub+'</div></div></div>';
}

function imprimirCierre() {
  var content = document.getElementById('cierreContent').innerHTML;
  var w = window.open('','_blank','width=480,height=700');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:Inter,sans-serif;margin:0;padding:1.5rem;max-width:400px;}@page{margin:1cm;}</style></head><body>'+content+'</body></html>');
  w.document.close(); w.onload = function(){ w.print(); };
}

window.showCierreCaja = showCierreCaja;
window.imprimirCierre = imprimirCierre;

//    GLOBALS                                    
// =====================================================
// MODULO CREDITO / DEUDAS
// =====================================================

// State credito
S._deudas    = [];
S._soportes      = [];
S._devoluciones  = [];
S._historialClienteActivo = null;
S._fotoData  = null;   // base64 foto actual
S._deudaActiva = null; // deuda seleccionada para pagar

// Cargar deudas desde Supabase
async function loadDeudas() {
  try {
    var r = await supa.selectRaw('deudas', 'select=*&order=ts_creacion.desc');
    S._deudas = (r || []).map(fromDBDeuda);
  } catch(e) { console.warn('loadDeudas:', e); S._deudas = []; }
}

function toDBDeuda(d) {
  return { id:d.id, co:d.co, client_id:d.clientId||null, client_name:d.clientName,
    venta_id:d.ventaId||null, inv_num:d.invNum, monto_total:d.montoTotal,
    monto_pagado:d.montoPagado, monto_deuda:d.montoDeuda, estado:d.estado,
    items:d.items||[], foto_url:d.fotoUrl||null, vendedor:d.vendedor||'',
    nota:d.nota||'', ts_creacion:d.tsCreacion||new Date().toISOString(),
    ts_vencimiento:d.tsVencimiento||null, ts_pagado:d.tsPagado||null, pagos:d.pagos||[] };
}
function fromDBDeuda(r) {
  return { id:r.id, co:r.co, clientId:r.client_id, clientName:r.client_name,
    ventaId:r.venta_id, invNum:r.inv_num, montoTotal:parseFloat(r.monto_total||0),
    montoPagado:parseFloat(r.monto_pagado||0), montoDeuda:parseFloat(r.monto_deuda||0),
    estado:r.estado, items:r.items||[], fotoUrl:r.foto_url||null,
    vendedor:r.vendedor||'', nota:r.nota||'',
    tsCreacion:r.ts_creacion, tsVencimiento:r.ts_vencimiento,
    tsPagado:r.ts_pagado, pagos:r.pagos||[] };
}

// Al hacer checkout con credito, crear deuda
async function crearDeuda(venta, foto) {
  var deuda = {
    id: uid(), co: venta.co, clientId: venta.clientId||null,
    clientName: venta.clientName, ventaId: venta.id, invNum: venta.invNum,
    montoTotal: venta.tot, montoPagado: 0, montoDeuda: venta.tot,
    estado: 'pendiente', items: venta.items, fotoUrl: foto||null,
    vendedor: venta.vendedor||'', nota: venta.nota||'',
    tsCreacion: new Date().toISOString(), tsVencimiento: null, tsPagado: null, pagos: []
  };
  S._deudas.unshift(deuda);
  await supa.insert('deudas', toDBDeuda(deuda));
  // Actualizar saldo cliente
  if (venta.clientId) {
    var c = DB.clients().find(x=>x.id===venta.clientId);
    if (c) {
      c.saldoDeuda = (c.saldoDeuda||0) + venta.tot;
      await supa.update('clientes', c.id, { saldo_deuda: c.saldoDeuda });
    }
  }
  return deuda;
}

// Render tabla deudas
var deudaFilter = 'all';
function filterDeudas(estado, btn) {
  deudaFilter = estado;
  document.querySelectorAll('#sec-credito .btn-sec').forEach(b=>b.style.fontWeight='');
  if (btn) btn.style.fontWeight = '800';
  renderDeudas();
}

function renderDeudas() {
  var srch = (document.getElementById('deudaSearch')?.value||'').toLowerCase();
  var coF  = document.getElementById('deudaCoF')?.value||'all';
  var list = S._deudas.filter(function(d) {
    var ms = !srch || d.clientName.toLowerCase().includes(srch) || d.invNum.toLowerCase().includes(srch);
    var mc = coF==='all' || d.co===coF;
    var mst= deudaFilter==='all' || d.estado===deudaFilter;
    return ms && mc && mst;
  });

  // KPIs
  var activas = S._deudas.filter(d=>d.estado!=='pagado');
  var totalDeuda = activas.reduce((s,d)=>s+d.montoDeuda,0);
  var clientsConDeuda = new Set(activas.map(d=>d.clientId||d.clientName)).size;
  var hoy = new Date().toISOString().slice(0,10);
  var cobradoHoy = S._deudas.reduce(function(s,d){
    return s + (d.pagos||[]).filter(p=>p.ts&&p.ts.startsWith(hoy)).reduce((a,p)=>a+p.monto,0);
  },0);
  document.getElementById('kDeudaTotal').textContent  = eur(totalDeuda);
  document.getElementById('kDeudaCount').textContent  = activas.length;
  document.getElementById('kDeudaClients').textContent= clientsConDeuda;
  document.getElementById('kCobradoHoy').textContent  = eur(cobradoHoy);

  var tb = document.getElementById('deudaTbody');
  if (!list.length) { tb.innerHTML='<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-3)">Sin deudas encontradas</td></tr>'; return; }

  var estadoTag = { pendiente:'tag-out', parcial:'tag-low', pagado:'tag-ok' };
  var estadoLbl = { pendiente:'Pendiente', parcial:'Parcial', pagado:'Pagado' };

  tb.innerHTML = list.map(function(d) {
    return '<tr>'
      +'<td style="font-family:DM Mono,monospace;font-size:.7rem;">'+d.invNum+'</td>'
      +'<td>'+dtShort(d.tsCreacion)+'</td>'
      +'<td><strong>'+d.clientName+'</strong></td>'
      +'<td><span class="tag tag-'+d.co+'">'+(d.co==='sol'?'Sol':'SP')+'</span></td>'
      +'<td style="font-family:DM Mono,monospace;">'+eur(d.montoTotal)+'</td>'
      +'<td style="font-family:DM Mono,monospace;color:var(--green);">'+eur(d.montoPagado)+'</td>'
      +'<td style="font-family:DM Mono,monospace;font-weight:800;color:'+(d.montoDeuda>0?'var(--red)':'var(--green)')+';">'+eur(d.montoDeuda)+'</td>'
      +'<td><span class="tag '+estadoTag[d.estado]+'">'+estadoLbl[d.estado]+'</span></td>'
      +'<td style="font-size:.72rem;color:var(--text-3);">'+(d.vendedor||'-')+'</td>'
      +'<td><div class="acts">'
      +'<button class="act v" onclick="verDeuda(\''+d.id+'\')">Ver</button>'
      +(d.estado!=='pagado'?'<button class="act e" style="color:var(--green)" onclick="abrirPagoModalId(\''+d.id+'\')">Cobrar</button>':'')
      +'<button class="act" onclick="imprimirDeuda(\''+d.id+'\')">PDF</button>'
      +'</div></td></tr>';
  }).join('');
}

// Ver detalle de deuda
function verDeuda(id) {
  var d = S._deudas.find(x=>x.id===id);
  if (!d) return;
  S._deudaActiva = d;

  var isLic = d.co==='lic';
  var col   = isLic?'#1D4ED8':'#F97316';
  var col2  = isLic?'#EAB308':'#FCD34D';

  var html = '<div style="display:flex;flex-direction:column;gap:1rem;">'
    // Header empresa
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;border-radius:12px;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-size:1rem;font-weight:800;">'+(isLic?'Licores San Pedro':'El Sol Latino')+'</div>'
    +'<div style="font-size:.75rem;opacity:.85;">Credito #'+d.invNum+'</div></div>'
    +'<div style="text-align:right;font-size:.75rem;"><div>'+dtFull(d.tsCreacion)+'</div>'
    +(d.vendedor?'<div>Vendedor: '+d.vendedor+'</div>':'')+'</div></div>'

    // Cliente y estado
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">'
    +'<div style="background:var(--bg);border-radius:var(--r2);padding:.85rem;">'
    +'<div style="font-size:.65rem;color:var(--text-3);font-weight:700;text-transform:uppercase;margin-bottom:.35rem;">Cliente</div>'
    +'<div style="font-size:1rem;font-weight:800;color:var(--text);">'+d.clientName+'</div>'
    +(d.nota?'<div style="font-size:.72rem;color:var(--text-3);margin-top:.25rem;font-style:italic;">'+d.nota+'</div>':'')
    +'</div>'
    +'<div style="background:var(--bg);border-radius:var(--r2);padding:.85rem;">'
    +'<div style="font-size:.65rem;color:var(--text-3);font-weight:700;text-transform:uppercase;margin-bottom:.35rem;">Saldo</div>'
    +'<div style="font-size:1.3rem;font-weight:800;color:'+(d.montoDeuda>0?'var(--red)':'var(--green)')+';">'+eur(d.montoDeuda)+'</div>'
    +'<div style="font-size:.7rem;color:var(--text-3);">de '+eur(d.montoTotal)+' total</div></div></div>'

    // Productos
    +'<div><div style="font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Mercancia entregada</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:.78rem;">'
    +'<thead><tr style="border-bottom:2px solid '+col+';">'
    +'<th style="text-align:left;padding:.3rem 0;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Producto</th>'
    +'<th style="text-align:center;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Cant.</th>'
    +'<th style="text-align:right;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">P.Unit</th>'
    +'<th style="text-align:right;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Total</th>'
    +'</tr></thead><tbody>'
    + d.items.map(function(i){ return '<tr style="border-bottom:1px solid var(--border);">'
      +'<td style="padding:.4rem 0;font-weight:500;">'+(i.emoji?i.emoji+' ':'')+i.name+'</td>'
      +'<td style="text-align:center;">x'+i.qty+'</td>'
      +'<td style="text-align:right;">'+eur(i.price)+'</td>'
      +'<td style="text-align:right;font-weight:700;">'+eur(i.price*i.qty)+'</td></tr>'; }).join('')
    +'</tbody></table></div>'

    // Foto si existe
    +(d.fotoUrl?'<div><div style="font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Foto de la mercancia</div>'
    +'<img src="'+d.fotoUrl+'" style="width:100%;max-height:220px;object-fit:cover;border-radius:var(--r2);border:1.5px solid var(--border);" alt="Foto mercancia"/></div>':'')

    // Historial pagos
    +(d.pagos&&d.pagos.length?'<div><div style="font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Historial de pagos</div>'
    + d.pagos.map(function(p){ return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem .6rem;background:var(--green-bg);border-radius:var(--r);margin-bottom:.3rem;font-size:.78rem;">'
      +'<span style="color:var(--text-2);">'+dtFull(p.ts)+'</span>'
      +'<span style="color:var(--text-3);">'+p.metodo+'</span>'
      +(p.nota?'<span style="color:var(--text-3);font-size:.7rem;font-style:italic;">'+p.nota+'</span>':'<span></span>')
      +'<span style="font-weight:800;color:var(--green);font-family:DM Mono,monospace;">+'+eur(p.monto)+'</span></div>'; }).join('')
    +'</div>':'')

    +'</div>';

  document.getElementById('deudaDetalleContent').innerHTML = html;
  document.getElementById('mDeudaDetalle').classList.remove('hidden');
}

function abrirPagoModal() {
  if (!S._deudaActiva) return;
  document.getElementById('mDeudaDetalle').classList.add('hidden');
  abrirPagoModalId(S._deudaActiva.id);
}

function abrirPagoModalId(id) {
  var d = S._deudas.find(x=>x.id===id);
  if (!d) return;
  S._deudaActiva = d;
  document.getElementById('pagoMonto').value = d.montoDeuda.toFixed(2);
  document.getElementById('pagoNota').value = '';
  document.getElementById('pagoMetodo').value = 'efectivo';
  document.getElementById('pagoInfo').innerHTML =
    '<strong>'+d.clientName+'</strong>   '+d.invNum
    +'<br><span style="color:var(--red);">Deuda: '+eur(d.montoDeuda)+'</span>';
  calcPagoResto();
  document.getElementById('mPago').classList.remove('hidden');
}

function calcPagoResto() {
  var d = S._deudaActiva; if (!d) return;
  var monto = parseFloat(document.getElementById('pagoMonto').value)||0;
  var resto = d.montoDeuda - monto;
  var el = document.getElementById('pagoResto');
  el.innerHTML = resto <= 0
    ? '<span style="color:var(--green);font-weight:700;">Deuda saldada completamente</span>'
    : '<span style="color:var(--amber);">Quedara pendiente: <strong>'+eur(Math.max(0,resto))+'</strong></span>';
}

async function confirmarPago() {
  var d = S._deudaActiva; if (!d) return;
  var monto = parseFloat(document.getElementById('pagoMonto').value)||0;
  if (monto <= 0) { toast('Ingresa un monto valido','err'); return; }
  if (monto > d.montoDeuda) { toast('El monto supera la deuda','err'); return; }

  var pago = { ts:new Date().toISOString(), monto, metodo:document.getElementById('pagoMetodo').value, nota:document.getElementById('pagoNota').value };
  var nuevoPagado = d.montoPagado + monto;
  var nuevaDeuda  = d.montoDeuda  - monto;
  var nuevoEstado = nuevaDeuda <= 0.009 ? 'pagado' : 'parcial';
  var nuevosPagos = [...(d.pagos||[]), pago];

  try {
    await supa.update('deudas', d.id, {
      monto_pagado: nuevoPagado, monto_deuda: Math.max(0, nuevaDeuda),
      estado: nuevoEstado, pagos: nuevosPagos,
      ts_pagado: nuevoEstado==='pagado' ? new Date().toISOString() : null
    });
    // Update local
    var idx = S._deudas.findIndex(x=>x.id===d.id);
    if (idx!==-1) {
      S._deudas[idx].montoPagado = nuevoPagado;
      S._deudas[idx].montoDeuda  = Math.max(0, nuevaDeuda);
      S._deudas[idx].estado      = nuevoEstado;
      S._deudas[idx].pagos       = nuevosPagos;
    }
    // Update saldo cliente
    if (d.clientId) {
      var c = DB.clients().find(x=>x.id===d.clientId);
      if (c) {
        c.saldoDeuda = Math.max(0, (c.saldoDeuda||0) - monto);
        await supa.update('clientes', c.id, { saldo_deuda: c.saldoDeuda });
      }
    }
    document.getElementById('mPago').classList.add('hidden');
    // Crear soporte automatico si hay imagen adjunta
    if (S._pagoSoporteData) {
      await crearSoportePagoDeuda(d, pago, S._pagoSoporteData);
      S._pagoSoporteData = null;
      var prev = document.getElementById('pagoSoportePreview');
      if (prev) prev.innerHTML = 'Pulsa para subir imagen o captura';
    }
    toast('Pago registrado: '+eur(monto), 'ok');
    renderDeudas();
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

// Imprimir deuda como factura
function imprimirDeuda(id) {
  var d = S._deudas.find(x=>x.id===id)||S._deudaActiva;
  if (!d) return;
  var isLic = d.co==='lic';
  var col   = isLic?'#1D4ED8':'#F97316';
  var col2  = isLic?'#EAB308':'#FCD34D';
  var coName= isLic?'Licores San Pedro':'El Sol Latino';

  var html = '<div style="font-family:Inter,sans-serif;color:#111;max-width:500px;margin:0 auto;">'
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:1.4rem;border-radius:12px 12px 0 0;text-align:center;">'
    +'<div style="font-size:1.3rem;font-weight:800;">'+coName+'</div>'
    +'<div style="font-size:.75rem;opacity:.85;margin-top:.2rem;">FACTURA DE CREDITO</div></div>'
    +'<div style="background:#F9FAFB;padding:.8rem 1.2rem;display:flex;justify-content:space-between;">'
    +'<div><div style="font-size:.6rem;color:#9CA3AF;font-weight:600;text-transform:uppercase;">N Factura</div>'
    +'<div style="font-size:1rem;font-weight:800;color:'+col+';">'+d.invNum+'</div></div>'
    +'<div style="text-align:right;font-size:.73rem;color:#6B7280;">'
    +'<div>'+dtFull(d.tsCreacion)+'</div>'
    +(d.vendedor?'<div>Vendedor: '+d.vendedor+'</div>':'')+'</div></div>'
    +'<div style="padding:.85rem 1.2rem;background:#fff;">'
    +'<div style="font-size:.7rem;color:#9CA3AF;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">Cliente</div>'
    +'<div style="font-size:1.1rem;font-weight:800;">'+d.clientName+'</div>'
    +(d.nota?'<div style="font-size:.72rem;color:#9CA3AF;margin-top:.2rem;font-style:italic;">'+d.nota+'</div>':'')
    +'</div>'
    +'<div style="padding:.85rem 1.2rem;background:#fff;border-top:1px solid #F3F4F6;">'
    +'<table style="width:100%;border-collapse:collapse;">'
    +'<thead><tr style="border-bottom:2px solid '+col+';">'
    +'<th style="text-align:left;padding:.3rem 0;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Producto</th>'
    +'<th style="text-align:center;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Cant.</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">P.Unit</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Total</th></tr></thead><tbody>'
    + d.items.map(function(i){ return '<tr style="border-bottom:1px solid #F3F4F6;">'
      +'<td style="padding:.42rem 0;font-size:.8rem;font-weight:500;">'+(i.emoji?i.emoji+' ':'')+i.name+'</td>'
      +'<td style="text-align:center;font-size:.8rem;">x'+i.qty+'</td>'
      +'<td style="text-align:right;font-size:.8rem;">'+eur(i.price)+'</td>'
      +'<td style="text-align:right;font-size:.8rem;font-weight:600;">'+eur(i.price*i.qty)+'</td></tr>'; }).join('')
    +'</tbody></table></div>'
    +'<div style="background:#F9FAFB;padding:.85rem 1.2rem;border-top:2px dashed #E5E7EB;">'
    +'<div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.3rem;"><span style="color:#6B7280;">Subtotal mercancia</span><span style="font-weight:600;">'+eur(d.montoTotal)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.3rem;"><span style="color:#10B981;">Pagado</span><span style="font-weight:700;color:#10B981;">'+eur(d.montoPagado)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;padding-top:.45rem;border-top:2px solid #E5E7EB;">'
    +'<span style="color:#EF4444;">DEBE</span><span style="color:#EF4444;font-family:DM Mono,monospace;">'+eur(d.montoDeuda)+'</span></div></div>'
    +(d.fotoUrl?'<div style="padding:.85rem 1.2rem;background:#fff;"><img src="'+d.fotoUrl+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;border:1px solid #E5E7EB;" alt="Mercancia"/></div>':'')
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:.85rem 1.2rem;border-radius:0 0 12px 12px;text-align:center;">'
    +'<div style="font-size:.78rem;font-weight:600;">Sistema POS - '+coName+'</div>'
    +'<div style="font-size:.62rem;opacity:.7;margin-top:.15rem;">Firma del cliente: ___________________</div></div></div>';

  var w = window.open('','_blank','width=580,height=820');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:Inter,sans-serif;margin:0;padding:1rem;}@page{margin:1cm;}</style></head><body>'+html+'</body></html>');
  w.document.close(); w.onload = function(){ w.print(); };
}

function imprimirDeudaDetalle() {
  if (S._deudaActiva) imprimirDeuda(S._deudaActiva.id);
}

// =====================================================
// MODULO FOTO MERCANCIA
// =====================================================
var fotoStream = null;

function abrirFotoModal() {
  document.getElementById('mFoto').classList.remove('hidden');
  if (S._fotoData) {
    document.getElementById('fotoPreview').innerHTML = '<img src="'+S._fotoData+'" style="width:100%;height:100%;object-fit:cover;border-radius:calc(var(--r2) - 2px);"/>';
  }
}

function cerrarFotoModal() {
  pararCamaraFoto();
  document.getElementById('mFoto').classList.add('hidden');
}

async function activarCamaraFoto() {
  try {
    fotoStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    var vid = document.getElementById('fotoVideo');
    vid.srcObject = fotoStream;
    vid.style.display = 'block';
    document.getElementById('fotoCapturarBtn').style.display = 'block';
    document.getElementById('fotoPreview').style.display = 'none';
  } catch(e) { toast('Camara no disponible','err'); }
}

function capturarFoto() {
  var vid = document.getElementById('fotoVideo');
  var canvas = document.getElementById('fotoCanvas');
  canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
  canvas.getContext('2d').drawImage(vid, 0, 0);
  S._fotoData = canvas.toDataURL('image/jpeg', 0.7);
  pararCamaraFoto();
  document.getElementById('fotoPreview').innerHTML = '<img src="'+S._fotoData+'" style="width:100%;height:100%;object-fit:cover;border-radius:calc(var(--r2) - 2px);"/>';
  document.getElementById('fotoPreview').style.display = 'flex';
  toast('Foto capturada','ok');
}

function pararCamaraFoto() {
  if (fotoStream) { fotoStream.getTracks().forEach(t=>t.stop()); fotoStream=null; }
  document.getElementById('fotoVideo').style.display = 'none';
  document.getElementById('fotoCapturarBtn').style.display = 'none';
  document.getElementById('fotoPreview').style.display = 'flex';
}

function onFotoFile(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    S._fotoData = e.target.result;
    document.getElementById('fotoPreview').innerHTML = '<img src="'+S._fotoData+'" style="width:100%;height:100%;object-fit:cover;border-radius:calc(var(--r2) - 2px);"/>';
    toast('Imagen cargada','ok');
  };
  reader.readAsDataURL(file);
}

function guardarFoto() {
  if (!S._fotoData) { toast('No hay foto que guardar','wrn'); return; }
  document.getElementById('fotoIndicator').style.display = 'block';
  cerrarFotoModal();
  toast('Foto adjuntada a la venta','ok');
}

window.filterDeudas = filterDeudas;
window.renderDeudas = renderDeudas;
window.verDeuda = verDeuda;
window.abrirPagoModal = abrirPagoModal;
window.abrirPagoModalId = abrirPagoModalId;
window.calcPagoResto = calcPagoResto;
window.confirmarPago = confirmarPago;
window.imprimirDeuda = imprimirDeuda;
window.imprimirDeudaDetalle = imprimirDeudaDetalle;
window.abrirFotoModal = abrirFotoModal;
window.cerrarFotoModal = cerrarFotoModal;
window.activarCamaraFoto = activarCamaraFoto;
window.capturarFoto = capturarFoto;
window.onFotoFile = onFotoFile;
window.guardarFoto = guardarFoto;


window.setCat=setCat;window.onBcKey=onBcKey;window.onBcInput=onBcInput;
window.toggleCam=toggleCam;window.stopCam=stopCam;
window.addToCart=addToCart;window.chQty=chQty;window.rmFromCart=rmFromCart;window.clearCart=clearCart;

// SOPORTE EN CARRITO (Wero / Datafono / RIB)
window._soporteCartData = null;
var _soporteCartStream  = null;

function onSoporteCart(input) {
  var file = input.files[0]; if (!file) return;
  var r = new FileReader();
  r.onload = function(e) {
    window._soporteCartData = e.target.result;
    _showSoportePreview(e.target.result);
    toast('Comprobante adjunto','ok');
  };
  r.readAsDataURL(file);
}
function _showSoportePreview(dataUrl) {
  var prev = document.getElementById('soportePreviewCart'); if (!prev) return;
  prev.innerHTML = '<img src="'+dataUrl+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"/>';
  prev.style.borderColor = 'var(--green)';
  var qBtn = document.getElementById('btnQuitarSoporte');
  if (qBtn) qBtn.style.display = 'block';
}
async function usarCamaraSoporteCart() {
  try {
    _soporteCartStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    var prev = document.getElementById('soportePreviewCart');
    var vid  = document.createElement('video');
    vid.srcObject=_soporteCartStream; vid.autoplay=true;
    vid.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:8px;';
    var capBtn=document.createElement('button');
    capBtn.textContent='Capturar';
    capBtn.style.cssText='position:absolute;bottom:6px;left:50%;transform:translateX(-50%);padding:.3rem .9rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.72rem;font-weight:700;font-family:inherit;';
    prev.style.position='relative'; prev.innerHTML=''; prev.appendChild(vid); prev.appendChild(capBtn);
    capBtn.onclick=function(){
      var c=document.createElement('canvas'); c.width=vid.videoWidth; c.height=vid.videoHeight;
      c.getContext('2d').drawImage(vid,0,0);
      window._soporteCartData=c.toDataURL('image/jpeg',0.8);
      _soporteCartStream.getTracks().forEach(function(t){t.stop();}); _soporteCartStream=null;
      _showSoportePreview(window._soporteCartData);
      toast('Captura lista','ok');
    };
  } catch(e){toast('Camara no disponible','err');}
}
function quitarSoporteCart() {
  window._soporteCartData=null;
  if(_soporteCartStream){_soporteCartStream.getTracks().forEach(function(t){t.stop();});_soporteCartStream=null;}
  var prev=document.getElementById('soportePreviewCart');
  if(prev){prev.innerHTML='Pulsa para subir imagen del comprobante';prev.style.borderColor='var(--border)';}
  var qBtn=document.getElementById('btnQuitarSoporte'); if(qBtn) qBtn.style.display='none';
}
window.onSoporteCart=onSoporteCart;
window.usarCamaraSoporteCart=usarCamaraSoporteCart;
window.quitarSoporteCart=quitarSoporteCart;
window.calcTotals=calcTotals;window.calcChange=calcChange;window.setPay=setPay;window.checkout=checkout;
window.closeInvoice=closeInvoice;window.printInvoice=printInvoice;window.dlPDF=dlPDF;
window.openProdModal=openProdModal;window.closeProdModal=closeProdModal;window.saveProd=saveProd;window.delProd=delProd;window.setEm=setEm;window.genBC=genBC;
window.openStockModal=openStockModal;window.closeStockModal=closeStockModal;window.updateStockCur=updateStockCur;window.saveStockAdj=saveStockAdj;
window.openClientModal=openClientModal;window.closeClientModal=closeClientModal;window.saveClient=saveClient;window.delClient=delClient;
window.renderProdsTable=renderProdsTable;window.renderStockTable=renderStockTable;window.renderVentasTable=renderVentasTable;window.renderClientsTable=renderClientsTable;
window.exportCSV=exportCSV;window.showSaleInv=showSaleInv;window.dashFilter=dashFilter;
window.loadCfgUI=loadCfgUI;window.saveConfig=saveConfig;window.exportData=exportData;window.clearAll=clearAll;window.loadDemo=loadDemo;
// =====================================================
// MODULO SOPORTES DE PAGO
// =====================================================

S._soportes = [];
S._soporteActivo = null;
S._pagoSoporteData = null;
var smImgData = null;

function toDBSoporte(s) {
  return { id:s.id, co:s.co, tipo:s.tipo, ref_id:s.refId, ref_num:s.refNum,
    client_name:s.clientName||'', monto:s.monto||0, metodo:s.metodo||'',
    imagen_data:s.imagenData||null, nota:s.nota||'', ts:s.ts };
}
function fromDBSoporte(r) {
  return { id:r.id, co:r.co, tipo:r.tipo, refId:r.ref_id, refNum:r.ref_num,
    clientName:r.client_name||'', monto:parseFloat(r.monto||0),
    metodo:r.metodo||'', imagenData:r.imagen_data||null, nota:r.nota||'', ts:r.ts };
}

async function guardarSoporte(data) {
  S._soportes.unshift(data);
  try { await supa.insert('soportes', toDBSoporte(data)); }
  catch(e) { console.warn('soporte insert:', e); }
}

function renderSoportes() {
  var srch = (document.getElementById('soporteSrch')?.value||'').toLowerCase();
  var tipo = document.getElementById('soporteTipo')?.value||'all';
  var coF  = document.getElementById('soporteCoF')?.value||'all';
  var df   = document.getElementById('soporteFrom')?.value;
  var dt   = document.getElementById('soporteTo')?.value;
  var hoy  = new Date().toISOString().slice(0,10);

  var list = S._soportes.filter(function(s) {
    var d = new Date(s.ts);
    return (tipo==='all'||s.tipo===tipo)
      && (coF==='all'||s.co===coF)
      && (!srch||s.clientName.toLowerCase().includes(srch)||s.refNum.toLowerCase().includes(srch))
      && (!df||d>=new Date(df))
      && (!dt||d<=new Date(dt+'T23:59:59'));
  });

  var conSoporte  = S._soportes.length;
  var montoTotal  = S._soportes.reduce(function(s,x){return s+x.monto;},0);
  var soportesHoy = S._soportes.filter(function(s){return s.ts&&s.ts.startsWith(hoy);}).length;
  var sinSoporte  = DB.ventas().filter(function(v){
    return ['tarjeta','bizum','transferencia'].includes(v.pay)&&!S._soportes.find(function(s){return s.refId===v.id;});
  }).length;

  document.getElementById('kSoportesTotal').textContent = conSoporte;
  document.getElementById('kSoportesMonto').textContent = eur(montoTotal);
  document.getElementById('kSinSoporte').textContent    = sinSoporte;
  document.getElementById('kSoportesHoy').textContent   = soportesHoy;

  var TL = { venta:'Venta', pago_deuda:'Pago deuda', transferencia:'Transferencia', otro:'Otro' };
  var tb = document.getElementById('soportesTbody');
  if (!list.length) {
    tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-3)">Sin soportes registrados</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(s) {
    return '<tr>'
      +'<td style="font-family:DM Mono,monospace;font-size:.7rem;">'+s.refNum+'</td>'
      +'<td>'+dtShort(s.ts)+'</td>'
      +'<td><span class="tag" style="background:var(--blue-bg);color:var(--blue);">'+(TL[s.tipo]||s.tipo)+'</span></td>'
      +'<td><strong>'+(s.clientName||'-')+'</strong></td>'
      +'<td><span class="tag tag-'+s.co+'">'+(s.co==='sol'?'Sol':'SP')+'</span></td>'
      +'<td style="font-size:.72rem;">'+(s.metodo||'-')+'</td>'
      +'<td style="font-weight:700;color:var(--green);font-family:DM Mono,monospace;">'+(s.monto?eur(s.monto):'-')+'</td>'
      +'<td>'+(s.imagenData?'<span style="font-size:.7rem;color:var(--green);font-weight:700;">Con imagen</span>':'<span style="font-size:.7rem;color:var(--red);">Sin imagen</span>')+'</td>'
      +'<td><div class="acts">'
      +'<button class="act v" onclick="verSoporte(\''+s.id+'\')">Ver</button>'
      +'<button class="act e" onclick="descargarSoportePDFById(\''+s.id+'\')">PDF</button>'
      +'<button class="act d" onclick="borrarSoporte(\''+s.id+'\')">Borrar</button>'
      +'</div></td></tr>';
  }).join('');
}

function verSoporte(id) {
  var s = S._soportes.find(function(x){return x.id===id;}); if (!s) return;
  S._soporteActivo = s;
  var TL = { venta:'Venta', pago_deuda:'Pago de deuda', transferencia:'Transferencia', otro:'Otro' };
  var col = s.co==='lic'?'#1D4ED8':'#F97316';
  var html = '<div style="display:flex;flex-direction:column;gap:1rem;">'
    +'<div style="background:var(--bg);border-radius:var(--r2);padding:.85rem 1rem;">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Referencia</div><div style="font-size:1rem;font-weight:800;color:'+col+';">'+s.refNum+'</div></div>'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Fecha</div><div style="font-size:.85rem;font-weight:600;">'+dtFull(s.ts)+'</div></div>'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Cliente</div><div style="font-size:.88rem;font-weight:700;">'+(s.clientName||'-')+'</div></div>'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Monto</div><div style="font-size:1rem;font-weight:800;color:var(--green);font-family:DM Mono,monospace;">'+(s.monto?eur(s.monto):'-')+'</div></div>'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Tipo</div><div style="font-size:.82rem;">'+(TL[s.tipo]||s.tipo)+'</div></div>'
    +'<div><div style="font-size:.62rem;color:var(--text-3);font-weight:700;text-transform:uppercase;">Metodo</div><div style="font-size:.82rem;">'+(s.metodo||'-')+'</div></div>'
    +'</div>'+(s.nota?'<div style="margin-top:.5rem;font-size:.75rem;color:var(--text-3);font-style:italic;">'+s.nota+'</div>':'')+'</div>'
    +(s.imagenData
      ?'<div><div style="font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.4rem;">Comprobante adjunto</div>'
        +'<img src="'+s.imagenData+'" style="width:100%;max-height:320px;object-fit:contain;border-radius:var(--r2);border:1.5px solid var(--border);background:#F9FAFB;" alt="Soporte"/></div>'
      :'<div style="text-align:center;padding:1.5rem;background:var(--bg);border-radius:var(--r2);color:var(--text-3);font-size:.8rem;">Sin imagen adjunta</div>')
    +'</div>';
  document.getElementById('verSoporteContent').innerHTML = html;
  document.getElementById('mVerSoporte').classList.remove('hidden');
}

async function compartirSoporte() {
  var s = S._soporteActivo; if (!s||!s.imagenData) { toast('Sin imagen para compartir','wrn'); return; }
  try {
    var blob = await (await fetch(s.imagenData)).blob();
    var file = new File([blob],'soporte_'+s.refNum+'.jpg',{type:'image/jpeg'});
    if (navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})) {
      await navigator.share({title:'Soporte '+s.refNum,files:[file]});
    } else {
      var a=document.createElement('a'); a.href=s.imagenData; a.download='soporte_'+s.refNum+'.jpg'; a.click();
      toast('Imagen descargada','ok');
    }
  } catch(e) { toast('Error al compartir','err'); }
}

function descargarSoportePDF() { if(S._soporteActivo) descargarSoportePDFById(S._soporteActivo.id); }

function descargarSoportePDFById(id) {
  var s = S._soportes.find(function(x){return x.id===id;}); if (!s) return;
  if (!window.jspdf) { toast('jsPDF no disponible','err'); return; }
  var {jsPDF} = window.jspdf;
  var isLic = s.co==='lic';
  var colR  = isLic?[29,78,216]:[249,115,22];
  var coName= isLic?'Licores San Pedro':'El Sol Latino';
  var TL    = {venta:'Comprobante de Venta',pago_deuda:'Comprobante de Pago de Deuda',transferencia:'Comprobante de Transferencia',otro:'Comprobante de Pago'};
  var doc   = new jsPDF({unit:'mm',format:'a5'});
  var W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(...colR); doc.rect(0,0,W,32,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(coName,W/2,11,{align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(TL[s.tipo]||'Comprobante',W/2,19,{align:'center'});
  doc.setFontSize(8);
  doc.text('Ref: '+s.refNum+'   |   '+dtFull(s.ts),W/2,27,{align:'center'});

  // Info
  doc.setTextColor(0,0,0);
  doc.setFillColor(249,250,251);
  doc.roundedRect(10,36,W-20,52,2,2,'F');
  var y=44;
  var row=function(lbl,val){
    doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(140,140,140);
    doc.text(lbl,14,y);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(20,20,20);
    doc.text(String(val||'-'),14,y+5); y+=13;
  };
  row('CLIENTE',  s.clientName||'No especificado');
  row('MONTO',    s.monto?eur(s.monto):'No especificado');
  row('METODO',   s.metodo?s.metodo.toUpperCase():'-');
  if(s.nota){row('NOTA',s.nota);}

  y=92;
  if(s.imagenData){
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(140,140,140);
    doc.text('COMPROBANTE ADJUNTO',12,y); y+=4;
    try { doc.addImage(s.imagenData,'JPEG',10,y,W-20,68,'','MEDIUM'); y+=72; }
    catch(e){ doc.setTextColor(200,0,0);doc.setFontSize(8);doc.text('No se pudo cargar imagen',12,y); }
  }

  // Footer
  doc.setFillColor(...colR); doc.rect(0,H-16,W,16,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('Generado por Sistema POS - '+coName,W/2,H-9,{align:'center'});
  doc.text('Este documento es un comprobante oficial de pago',W/2,H-4,{align:'center'});

  doc.save('Soporte_'+s.refNum+'.pdf');
  toast('PDF: Soporte_'+s.refNum+'.pdf','ok');
}

async function borrarSoporte(id) {
  if(!confirm('Eliminar este soporte?'))return;
  S._soportes=S._soportes.filter(function(s){return s.id!==id;});
  try{await fetch(SUPA_URL+'/rest/v1/soportes?id=eq.'+id,{method:'DELETE',headers:supa._h});toast('Eliminado','ok');}
  catch(e){toast('Error: '+e.message,'err');}
  renderSoportes();
}

function openSoporteManual(){
  smImgData=null;
  ['smRef','smClient','smMonto','smNota'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('smCo').value=S.co;
  document.getElementById('smImgPreview').innerHTML='Pulsa para subir imagen';
  document.getElementById('mSoporteManual').classList.remove('hidden');
}
function onSmImg(input){
  var file=input.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(e){
    smImgData=e.target.result;
    document.getElementById('smImgPreview').innerHTML='<img src="'+smImgData+'" style="width:100%;height:100%;object-fit:contain;"/>';
    toast('Imagen cargada','ok');
  };r.readAsDataURL(file);
}
async function guardarSoporteManual(){
  var ref=document.getElementById('smRef').value.trim();
  if(!ref){toast('Referencia obligatoria','err');return;}
  var data={id:uid(),co:document.getElementById('smCo').value,tipo:document.getElementById('smTipo').value,
    refId:ref,refNum:ref,clientName:document.getElementById('smClient').value.trim(),
    monto:parseFloat(document.getElementById('smMonto').value)||0,
    metodo:document.getElementById('smMetodo').value,
    imagenData:smImgData||null,nota:document.getElementById('smNota').value.trim(),
    ts:new Date().toISOString()};
  var btn=document.querySelector('#mSoporteManual .btn-pri');
  btn.disabled=true;btn.textContent='Guardando...';
  try{await guardarSoporte(data);document.getElementById('mSoporteManual').classList.add('hidden');renderSoportes();toast('Soporte guardado','ok');}
  catch(e){toast('Error: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='Guardar Soporte';}
}

function onPagoSoporte(input){
  var file=input.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(e){
    S._pagoSoporteData=e.target.result;
    var prev=document.getElementById('pagoSoportePreview');
    if(prev)prev.innerHTML='<img src="'+S._pagoSoporteData+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px;"/>';
    toast('Soporte cargado','ok');
  };r.readAsDataURL(file);
}

async function capturarPagoSoporte(){
  try{
    var stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    var prev=document.getElementById('pagoSoportePreview');
    var vid=document.createElement('video');vid.srcObject=stream;vid.autoplay=true;vid.style.cssText='width:100%;border-radius:8px;';
    var capBtn=document.createElement('button');capBtn.textContent='Capturar';
    capBtn.style.cssText='width:100%;margin-top:.3rem;padding:.38rem;background:var(--accent);color:#fff;border:none;border-radius:var(--r);cursor:pointer;font-weight:600;';
    capBtn.onclick=function(){
      var c=document.createElement('canvas');c.width=vid.videoWidth;c.height=vid.videoHeight;
      c.getContext('2d').drawImage(vid,0,0);
      S._pagoSoporteData=c.toDataURL('image/jpeg',0.75);
      stream.getTracks().forEach(function(t){t.stop();});
      prev.innerHTML='<img src="'+S._pagoSoporteData+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px;"/>';
      toast('Captura lista','ok');
    };
    prev.innerHTML='';prev.appendChild(vid);prev.appendChild(capBtn);
  }catch(e){toast('Camara no disponible','err');}
}

async function crearSoportePagoDeuda(deuda,pago,imagenData){
  var data={id:uid(),co:deuda.co,tipo:'pago_deuda',refId:deuda.id,refNum:deuda.invNum,
    clientName:deuda.clientName,monto:pago.monto,metodo:pago.metodo,
    imagenData:imagenData||null,nota:pago.nota||'',ts:new Date().toISOString()};
  await guardarSoporte(data);
}

async function crearSoporteVenta(venta,imagenData){
  if(!imagenData)return;
  var data={id:uid(),co:venta.co,tipo:'venta',refId:venta.id,refNum:venta.invNum,
    clientName:venta.clientName,monto:venta.tot,metodo:venta.pay,
    imagenData:imagenData,nota:venta.nota||'',ts:new Date().toISOString()};
  await guardarSoporte(data);
}

// =====================================================
// MODULO DEVOLUCIONES
// =====================================================

S._devoluciones = [];

function toDBDevolucion(d) {
  return { id:d.id, co:d.co, venta_id:d.ventaId||null, inv_num:d.invNum,
    client_id:d.clientId||null, client_name:d.clientName, items:d.items||[],
    motivo:d.motivo||'', tipo:d.tipo, monto:d.monto||0,
    metodo_dev:d.metodoDev||'efectivo', vendedor:d.vendedor||'', ts:d.ts };
}
function fromDBDevolucion(r) {
  return { id:r.id, co:r.co, ventaId:r.venta_id, invNum:r.inv_num,
    clientId:r.client_id, clientName:r.client_name, items:r.items||[],
    motivo:r.motivo||'', tipo:r.tipo, monto:parseFloat(r.monto||0),
    metodoDev:r.metodo_dev, vendedor:r.vendedor||'', ts:r.ts };
}

async function loadDevoluciones() {
  try {
    var r = await supa.selectRaw('devoluciones', 'select=*&order=ts.desc');
    S._devoluciones = (r||[]).map(fromDBDevolucion);
  } catch(e) { S._devoluciones = []; }
}

function renderDevoluciones() {
  var srch = (document.getElementById('devSrch')?.value||'').toLowerCase();
  var coF  = document.getElementById('devCoF')?.value||'all';
  var tipo = document.getElementById('devTipo')?.value||'all';
  var df   = document.getElementById('devFrom')?.value;
  var dt   = document.getElementById('devTo')?.value;
  var mes  = new Date().toISOString().slice(0,7);

  var list = S._devoluciones.filter(function(d) {
    var dd = new Date(d.ts);
    return (coF==='all'||d.co===coF)
      && (tipo==='all'||d.tipo===tipo)
      && (!srch||(d.clientName||'').toLowerCase().includes(srch)||d.invNum.toLowerCase().includes(srch))
      && (!df||dd>=new Date(df))
      && (!dt||dd<=new Date(dt+'T23:59:59'));
  });

  // KPIs
  var total   = S._devoluciones.reduce(function(s,d){return s+d.monto;},0);
  var esMes   = S._devoluciones.filter(function(d){return d.ts.startsWith(mes);}).length;
  var notas   = S._devoluciones.filter(function(d){return d.tipo==='nota_credito';}).length;
  var cambios = S._devoluciones.filter(function(d){return d.tipo==='cambio';}).length;

  document.getElementById('kDevTotal').textContent   = eur(total);
  document.getElementById('kDevMes').textContent     = esMes;
  document.getElementById('kDevNotas').textContent   = notas;
  document.getElementById('kDevCambios').textContent = cambios;

  var TL = { devolucion:'Devolucion', cambio:'Cambio', nota_credito:'Nota credito' };
  var tb = document.getElementById('devTbody');

  if (!list.length) {
    tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-3)">Sin devoluciones registradas</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(d) {
    return '<tr>'
      +'<td style="font-family:DM Mono,monospace;font-size:.7rem;">'+d.invNum+'</td>'
      +'<td>'+dtShort(d.ts)+'</td>'
      +'<td><span class="tag" style="background:var(--red-bg);color:var(--red);">'+(TL[d.tipo]||d.tipo)+'</span></td>'
      +'<td><strong>'+(d.clientName||'Generico')+'</strong></td>'
      +'<td><span class="tag tag-'+d.co+'">'+(d.co==='sol'?'Sol':'SP')+'</span></td>'
      +'<td style="font-size:.72rem;color:var(--text-3);">'+d.items.length+' prod.</td>'
      +'<td style="font-size:.72rem;color:var(--text-3);">'+(d.motivo||'-')+'</td>'
      +'<td style="font-weight:700;color:var(--red);font-family:DM Mono,monospace;">'+eur(d.monto)+'</td>'
      +'<td><div class="acts">'
      +'<button class="act v" onclick="verDevolucion(\''+d.id+'\')">Ver</button>'
      +'<button class="act e" onclick="imprimirDevolucion(\''+d.id+'\')">PDF</button>'
      +'</div></td></tr>';
  }).join('');
}

function openDevolucionModal() {
  // Populate client select
  var sel = document.getElementById('dCliente');
  sel.innerHTML = '<option value="">Cliente generico</option>'
    + DB.clients().map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  document.getElementById('dCo').value = S.co;
  document.getElementById('dFactura').value = '';
  document.getElementById('dMotivo').value = '';
  document.getElementById('dMontoTotal').value = '';
  // Reset items to one row
  document.getElementById('dItemsWrap').innerHTML = buildDevItemRow();
  document.getElementById('mDevolucion').classList.remove('hidden');
}

function buildDevItemRow() {
  return '<div class="d-item-row" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;align-items:center;">'
    +'<input class="fc d-name" placeholder="Nombre producto" style="font-size:.78rem;"/>'
    +'<input class="fc d-qty" type="number" placeholder="Cant." min="1" value="1" style="font-size:.78rem;"/>'
    +'<input class="fc d-price" type="number" placeholder="Precio" step="0.01" min="0" style="font-size:.78rem;" oninput="calcDevTotal()"/>'
    +'<button onclick="removeDevItem(this)" style="background:var(--red-bg);border:1.5px solid rgba(239,68,68,.3);color:var(--red);border-radius:var(--r);padding:.3rem .5rem;cursor:pointer;font-size:.75rem;">x</button>'
    +'</div>';
}

function addDevItem() {
  document.getElementById('dItemsWrap').insertAdjacentHTML('beforeend', buildDevItemRow());
}

function removeDevItem(btn) {
  var rows = document.querySelectorAll('.d-item-row');
  if (rows.length <= 1) return;
  btn.closest('.d-item-row').remove();
  calcDevTotal();
}

function calcDevTotal() {
  var rows  = document.querySelectorAll('.d-item-row');
  var total = 0;
  rows.forEach(function(row) {
    var qty   = parseFloat(row.querySelector('.d-qty')?.value)||1;
    var price = parseFloat(row.querySelector('.d-price')?.value)||0;
    total += qty * price;
  });
  document.getElementById('dMontoTotal').value = total.toFixed(2);
}

async function guardarDevolucion() {
  var rows = document.querySelectorAll('.d-item-row');
  var items = [];
  rows.forEach(function(row) {
    var name  = row.querySelector('.d-name')?.value.trim();
    var qty   = parseInt(row.querySelector('.d-qty')?.value)||1;
    var price = parseFloat(row.querySelector('.d-price')?.value)||0;
    if (name) items.push({ name, qty, price });
  });
  if (!items.length) { toast('Agrega al menos un producto','err'); return; }

  var clientId   = document.getElementById('dCliente').value;
  var clientName = clientId ? (DB.clients().find(function(c){return c.id===clientId;})?.name||'Generico') : 'Generico';
  var facturaRef = document.getElementById('dFactura').value.trim();
  var co         = document.getElementById('dCo').value;
  var tipo       = document.getElementById('dTipo').value;
  var monto      = parseFloat(document.getElementById('dMontoTotal').value)||0;
  var prefix     = co==='sol'?'DEV-SL':'DEV-SP';
  var invNum     = prefix+'-'+new Date().getFullYear()+'-'+String(S._devoluciones.length+1).padStart(4,'0');

  var d = {
    id:uid(), co, ventaId:null, invNum,
    clientId:clientId||null, clientName,
    items, motivo:document.getElementById('dMotivo').value,
    tipo, monto, metodoDev:document.getElementById('dMetodo').value,
    vendedor:getVendedor(), ts:new Date().toISOString()
  };

  // Si hay factura original, vincular venta
  if (facturaRef) {
    var v = DB.ventas().find(function(x){return x.invNum===facturaRef;});
    if (v) d.ventaId = v.id;
  }

  var btn = document.querySelector('#mDevolucion .btn-pri');
  btn.disabled=true; btn.textContent='Guardando...';
  try {
    S._devoluciones.unshift(d);
    await supa.insert('devoluciones', toDBDevolucion(d));
    // Reponer stock si es devolucion real
    if (tipo === 'devolucion' || tipo === 'cambio') {
      var prods = DB.prods();
      items.forEach(function(item) {
        var p = prods.find(function(x){return x.name.toLowerCase()===item.name.toLowerCase();});
        if (p) {
          p.stock += item.qty;
          supa.update('productos', p.id, { stock:p.stock });
        }
      });
    }
    document.getElementById('mDevolucion').classList.add('hidden');
    renderDevoluciones();
    renderProdGrid();
    toast('Devolucion registrada: '+invNum,'ok');
  } catch(e) { toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='Registrar Devolucion'; }
}

function verDevolucion(id) {
  var d = S._devoluciones.find(function(x){return x.id===id;});
  if (!d) return;
  imprimirDevolucion(id);
}

function imprimirDevolucion(id) {
  var d = S._devoluciones.find(function(x){return x.id===id;}); if (!d) return;
  var isLic = d.co==='lic';
  var col   = isLic?'#1D4ED8':'#F97316';
  var col2  = isLic?'#EAB308':'#FCD34D';
  var coName= isLic?'Licores San Pedro':'El Sol Latino';
  var TL    = {devolucion:'NOTA DE DEVOLUCION',cambio:'CAMBIO DE PRODUCTO',nota_credito:'NOTA DE CREDITO'};

  var html = '<div style="font-family:Inter,sans-serif;color:#111;max-width:500px;margin:0 auto;">'
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:1.4rem;border-radius:12px 12px 0 0;text-align:center;">'
    +'<div style="font-size:1.3rem;font-weight:800;">'+coName+'</div>'
    +'<div style="font-size:.82rem;opacity:.9;margin-top:.2rem;font-weight:700;">'+(TL[d.tipo]||d.tipo.toUpperCase())+'</div></div>'
    +'<div style="background:#F9FAFB;padding:.8rem 1.2rem;display:flex;justify-content:space-between;">'
    +'<div><div style="font-size:.6rem;text-transform:uppercase;color:#9CA3AF;font-weight:600;">Referencia</div>'
    +'<div style="font-size:1rem;font-weight:800;color:'+col+';">'+d.invNum+'</div></div>'
    +'<div style="text-align:right;font-size:.73rem;color:#6B7280;"><div>'+dtFull(d.ts)+'</div>'
    +'<div>Cliente: <strong>'+d.clientName+'</strong></div></div></div>'
    +'<div style="padding:.85rem 1.2rem;background:#fff;border-top:1px solid #F3F4F6;">'
    +'<table style="width:100%;border-collapse:collapse;">'
    +'<thead><tr style="border-bottom:2px solid '+col+';">'
    +'<th style="text-align:left;padding:.3rem 0;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Producto</th>'
    +'<th style="text-align:center;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Cant.</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">P.Unit</th>'
    +'<th style="text-align:right;font-size:.62rem;color:#9CA3AF;text-transform:uppercase;">Total</th></tr></thead><tbody>'
    + d.items.map(function(i){return '<tr style="border-bottom:1px solid #F3F4F6;">'
      +'<td style="padding:.42rem 0;font-size:.8rem;font-weight:500;">'+i.name+'</td>'
      +'<td style="text-align:center;font-size:.8rem;">x'+i.qty+'</td>'
      +'<td style="text-align:right;font-size:.8rem;">'+eur(i.price)+'</td>'
      +'<td style="text-align:right;font-size:.8rem;font-weight:600;">'+eur(i.price*i.qty)+'</td></tr>';}).join('')
    +'</tbody></table></div>'
    +'<div style="background:#FEF2F2;padding:.85rem 1.2rem;border-top:2px dashed #FECACA;">'
    +'<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;color:#EF4444;">'
    +'<span>TOTAL DEVOLUCION</span><span>'+eur(d.monto)+'</span></div>'
    +'<div style="font-size:.75rem;color:#9CA3AF;margin-top:.3rem;">Metodo: '+d.metodoDev+'</div>'
    +(d.motivo?'<div style="font-size:.75rem;color:#9CA3AF;margin-top:.2rem;">Motivo: '+d.motivo+'</div>':'')
    +'</div>'
    +'<div style="background:linear-gradient(135deg,'+col+','+col2+');color:#fff;padding:.85rem 1.2rem;border-radius:0 0 12px 12px;text-align:center;">'
    +'<div style="font-size:.78rem;font-weight:600;">Sistema POS - '+coName+'</div>'
    +'<div style="font-size:.62rem;opacity:.7;margin-top:.15rem;">Firma del cliente: ___________________</div></div></div>';

  var w = window.open('','_blank','width=580,height=820');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:Inter,sans-serif;margin:0;padding:1rem;}@page{margin:1cm;}</style></head><body>'+html+'</body></html>');
  w.document.close(); w.onload=function(){w.print();};
}

window.renderDevoluciones = renderDevoluciones;
window.openDevolucionModal = openDevolucionModal;
window.addDevItem = addDevItem;
window.removeDevItem = removeDevItem;
window.calcDevTotal = calcDevTotal;
window.guardarDevolucion = guardarDevolucion;
window.verDevolucion = verDevolucion;
window.imprimirDevolucion = imprimirDevolucion;

// =====================================================
// HISTORIAL DE COMPRAS POR CLIENTE
// =====================================================

function verHistorialCliente(clientId) {
  var c = DB.clients().find(function(x){return x.id===clientId;});
  if (!c) return;
  var ventas = DB.ventas().filter(function(v){return v.clientId===clientId;});
  var deudas = S._deudas.filter(function(d){return d.clientId===clientId;});

  document.getElementById('mHistTitle').textContent = 'Historial: '+c.name;

  // Stats
  var totalCompras  = ventas.reduce(function(s,v){return s+v.tot;},0);
  var totalDeuda    = deudas.filter(function(d){return d.estado!=='pagado';}).reduce(function(s,d){return s+d.montoDeuda;},0);
  var ultimaCompra  = ventas.length ? dtShort(ventas[0].ts) : 'Nunca';
  var metodoFav     = '';
  if (ventas.length) {
    var mc = {}; ventas.forEach(function(v){mc[v.pay]=(mc[v.pay]||0)+1;});
    metodoFav = Object.entries(mc).sort(function(a,b){return b[1]-a[1];})[0][0];
  }

  var html = '<div style="display:flex;flex-direction:column;gap:1rem;">'
    // Stats strip
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;">'
    +statBox('Total compras', eur(totalCompras), 'var(--green)')
    +statBox('N ventas', ventas.length, 'var(--blue)')
    +statBox('Deuda pendiente', eur(totalDeuda), totalDeuda>0?'var(--red)':'var(--green)')
    +statBox('Metodo favorito', metodoFav||'-', 'var(--accent)')
    +'</div>'
    // Ventas list
    +'<div><div style="font-size:.8rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Compras realizadas</div>'
    +(ventas.length
      ? '<table style="width:100%;border-collapse:collapse;font-size:.78rem;">'
        +'<thead><tr style="border-bottom:1.5px solid var(--border);">'
        +'<th style="text-align:left;padding:.35rem 0;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Factura</th>'
        +'<th style="text-align:left;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Fecha</th>'
        +'<th style="text-align:left;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Productos</th>'
        +'<th style="text-align:left;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Metodo</th>'
        +'<th style="text-align:right;font-size:.65rem;color:var(--text-3);text-transform:uppercase;">Total</th></tr></thead><tbody>'
        +ventas.map(function(v){
          return '<tr style="border-bottom:1px solid var(--border);">'
            +'<td style="padding:.4rem 0;font-family:DM Mono,monospace;font-size:.7rem;color:var(--accent);">'+v.invNum+'</td>'
            +'<td style="padding:.4rem 0;color:var(--text-2);">'+dtShort(v.ts)+'</td>'
            +'<td style="padding:.4rem 0;color:var(--text-3);font-size:.72rem;">'+v.items.map(function(i){return i.name+' x'+i.qty;}).join(', ')+'</td>'
            +'<td style="padding:.4rem 0;"><span style="font-size:.68rem;padding:.1rem .35rem;border-radius:100px;background:var(--bg);">'+v.pay+'</span></td>'
            +'<td style="padding:.4rem 0;text-align:right;font-weight:700;font-family:DM Mono,monospace;color:var(--green);">'+eur(v.tot)+'</td></tr>';
        }).join('')
        +'</tbody></table>'
      : '<div style="text-align:center;padding:1.5rem;color:var(--text-3);font-size:.8rem;">Sin compras registradas</div>')
    +'</div>'
    // Deudas
    +(deudas.length
      ? '<div><div style="font-size:.8rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Creditos y deudas</div>'
        +deudas.map(function(d){
          var estadoC = d.estado==='pagado'?'var(--green)':d.montoDeuda>0?'var(--red)':'var(--amber)';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.45rem .65rem;background:var(--bg);border-radius:var(--r);margin-bottom:.3rem;font-size:.78rem;">'
            +'<div><span style="font-family:DM Mono,monospace;color:var(--accent);font-size:.7rem;">'+d.invNum+'</span>'
            +' <span style="color:var(--text-3);">'+dtShort(d.tsCreacion)+'</span></div>'
            +'<div style="text-align:right;">'
            +'<div style="font-weight:800;color:'+estadoC+';font-family:DM Mono,monospace;">'+eur(d.montoDeuda)+'</div>'
            +'<div style="font-size:.65rem;color:var(--text-3);">de '+eur(d.montoTotal)+' - '+d.estado+'</div>'
            +'</div></div>';
        }).join('')+'</div>'
      : '')
    +'</div>';

  document.getElementById('historialContent').innerHTML = html;
  document.getElementById('mHistorialCliente').classList.remove('hidden');

  // Store for PDF export
  S._historialClienteActivo = { c, ventas, deudas, totalCompras };
}

function statBox(label, value, color) {
  return '<div style="background:var(--bg);border-radius:var(--r2);padding:.7rem;text-align:center;">'
    +'<div style="font-size:.62rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:.2rem;">'+label+'</div>'
    +'<div style="font-size:.95rem;font-weight:800;color:'+color+';">'+value+'</div></div>';
}

function exportHistorialPDF() {
  var data = S._historialClienteActivo; if (!data) return;
  if (!window.jspdf) { toast('jsPDF no disponible','err'); return; }
  var {jsPDF} = window.jspdf;
  var doc = new jsPDF({unit:'mm',format:'a4'});
  var W = doc.internal.pageSize.getWidth();
  var H = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(249,115,22); doc.rect(0,0,W,25,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text('Historial de Cliente', W/2, 10, {align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(data.c.name+' - Generado: '+dtShort(new Date().toISOString()), W/2, 18, {align:'center'});

  // Summary row
  doc.setTextColor(0,0,0); doc.setFontSize(9);
  var y = 32;
  doc.setFillColor(249,250,251); doc.rect(10,y-4,W-20,16,'F');
  doc.setFont('helvetica','bold'); doc.text('Total compras: '+eur(data.totalCompras), 14, y+2);
  doc.text('N ventas: '+data.ventas.length, 70, y+2);
  doc.text('Email: '+(data.c.email||'-'), 110, y+2);
  doc.text('Tel: '+(data.c.phone||'-'), 165, y+2);
  y += 18;

  // Ventas table
  if (data.ventas.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Historial de compras', 10, y); y+=3;
    doc.autoTable({
      startY:y,
      head:[['Factura','Fecha','Productos','Metodo','Total']],
      body:data.ventas.map(function(v){return [
        v.invNum, dtShort(v.ts),
        v.items.map(function(i){return i.name+' x'+i.qty;}).join(', ').substring(0,50),
        v.pay, eur(v.tot)
      ];}),
      headStyles:{fillColor:[249,115,22],textColor:[255,255,255],fontSize:8},
      bodyStyles:{fontSize:7.5},
      margin:{left:10,right:10}, styles:{cellPadding:2},
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Footer
  doc.setFillColor(249,115,22); doc.rect(0,H-12,W,12,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(7);
  doc.text('Sistema POS - Sol Latino & Licores San Pedro', W/2, H-5, {align:'center'});

  doc.save('Historial_'+data.c.name.replace(/ /g,'_')+'.pdf');
  toast('PDF descargado','ok');
}

window.verHistorialCliente = verHistorialCliente;
window.exportHistorialPDF  = exportHistorialPDF;

// =====================================================
// ALERTAS: STOCK BAJO + FECHA VENCIMIENTO + DEUDAS
// =====================================================

function getAlertas() {
  var alertas = [];
  var hoy = new Date();

  // 1. Stock bajo
  DB.prods().forEach(function(p) {
    if (p.stock <= 0) {
      alertas.push({ tipo:'stock_cero', nivel:'critico', msg:'SIN STOCK: '+p.name, empresa:p.co, prod:p });
    } else if (p.stock <= p.min) {
      alertas.push({ tipo:'stock_bajo', nivel:'warning', msg:'Stock bajo ('+p.stock+'): '+p.name, empresa:p.co, prod:p });
    }
    // 2. Fecha de vencimiento
    if (p.fechaVenc) {
      var fv = new Date(p.fechaVenc);
      var diasRestantes = Math.ceil((fv - hoy) / (1000*60*60*24));
      if (diasRestantes < 0) {
        alertas.push({ tipo:'vencido', nivel:'critico', msg:'VENCIDO ('+dtShort(p.fechaVenc)+'): '+p.name, empresa:p.co, prod:p });
      } else if (diasRestantes <= (p.diasAlerta||7)) {
        alertas.push({ tipo:'por_vencer', nivel:'warning', msg:'Vence en '+diasRestantes+' dias ('+dtShort(p.fechaVenc)+'): '+p.name, empresa:p.co, prod:p });
      }
    }
  });

  // 3. Deudas vencidas (mas de 30 dias sin pagar)
  S._deudas.filter(function(d){return d.estado!=='pagado';}).forEach(function(d) {
    var diasDeuda = Math.ceil((hoy - new Date(d.tsCreacion)) / (1000*60*60*24));
    var limite = d.diasVencimiento || 30;
    if (diasDeuda > limite) {
      alertas.push({ tipo:'deuda_vencida', nivel:'critico', msg:'Deuda '+diasDeuda+' dias: '+d.clientName+' - '+eur(d.montoDeuda), empresa:d.co });
    } else if (diasDeuda > limite * 0.8) {
      alertas.push({ tipo:'deuda_proxima', nivel:'warning', msg:'Deuda por vencer ('+diasDeuda+'/'+limite+' dias): '+d.clientName, empresa:d.co });
    }
  });

  return alertas;
}

function renderAlertasPanel() {
  var alertas = getAlertas();
  var container = document.getElementById('alertsList');
  if (!container) return;

  if (!alertas.length) {
    container.innerHTML = '<div style="color:var(--text-3);font-size:.78rem;padding:.4rem">Todo en orden - sin alertas activas</div>';
    return;
  }

  container.innerHTML = alertas.slice(0,15).map(function(a) {
    var isCrit = a.nivel==='critico';
    var icons  = { stock_cero:'X', stock_bajo:'!', vencido:'EXP', por_vencer:'~', deuda_vencida:'$!', deuda_proxima:'$' };
    return '<div class="alert-row '+(isCrit?'r':'w')+'">'
      +'<span style="font-size:.65rem;font-weight:800;min-width:28px;">'+(icons[a.tipo]||'!')+'</span>'
      +'<span class="ar-nm">'+a.msg+'</span>'
      +'<span class="tag tag-'+a.empresa+'" style="font-size:.6rem;">'+(a.empresa==='sol'?'SL':'SP')+'</span>'
      +'</div>';
  }).join('');

  // Update badge on nav
  var badge = document.getElementById('alertBadge');
  if (badge) {
    badge.textContent = alertas.length;
    badge.style.display = alertas.length ? 'flex' : 'none';
  }
}

// Override renderDash to use new alertas
var _origDrawAlerts = typeof drawAlerts !== 'undefined' ? drawAlerts : null;
function drawAlerts() { renderAlertasPanel(); }

window.getAlertas = getAlertas;
window.renderAlertasPanel = renderAlertasPanel;


window.compartirSoporte=compartirSoporte;window.descargarSoportePDF=descargarSoportePDF;
window.descargarSoportePDFById=descargarSoportePDFById;window.borrarSoporte=borrarSoporte;
window.openSoporteManual=openSoporteManual;window.onSmImg=onSmImg;
window.guardarSoporteManual=guardarSoporteManual;window.onPagoSoporte=onPagoSoporte;
window.capturarPagoSoporte=capturarPagoSoporte;


// =====================================================
//  APARTADOS / PEDIDOS
// =====================================================

S._apartados = [];

function toDBApd(a) {
  return {
    id: a.id, co: a.co, num: a.num,
    client_id: a.clientId || null,
    client_name: a.clientName || 'Genérico',
    items: a.items,
    sub: a.sub, disc: a.disc, dp: a.dp, tax: a.tax, tot: a.tot,
    anticipo: a.anticipo, resta: a.resta,
    estado: a.estado,
    fecha_entrega: a.fechaEntrega || null,
    nota: a.nota || null,
    ts_creacion: a.tsCreacion,
    ts_entrega: a.tsEntrega || null
  };
}
function fromDBApd(r) {
  return {
    id: r.id, co: r.co, num: r.num,
    clientId: r.client_id, clientName: r.client_name,
    items: r.items || [],
    sub: parseFloat(r.sub || 0), disc: parseFloat(r.disc || 0),
    dp: parseFloat(r.dp || 0), tax: parseFloat(r.tax || 0), tot: parseFloat(r.tot || 0),
    anticipo: parseFloat(r.anticipo || 0), resta: parseFloat(r.resta || 0),
    estado: r.estado || 'pendiente',
    fechaEntrega: r.fecha_entrega || null,
    nota: r.nota || null,
    tsCreacion: r.ts_creacion, tsEntrega: r.ts_entrega || null
  };
}

function makeAptNum() {
  var co = document.getElementById('aptCo2').value;
  var pf = co === 'sol' ? 'APT-SL' : 'APT-SP';
  var yr = new Date().getFullYear();
  var n  = (S._apartados || []).filter(a => a.co === co).length + 1;
  return pf + '-' + yr + '-' + String(n).padStart(4, '0');
}

// ---- items del formulario ----
var _aptItems = [];

function renderAptItemsForm() {
  var wrap = document.getElementById('aptItemsWrap');
  if (!_aptItems.length) {
    wrap.innerHTML = '<div style="color:var(--text-3);font-size:.78rem;padding:.4rem 0;">Sin productos agregados</div>';
    return;
  }
  wrap.innerHTML = _aptItems.map(function(it, idx) {
    return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;align-items:center;">'
      + '<span style="font-size:.8rem;font-weight:500;">' + (it.emoji || '') + ' ' + it.name + '</span>'
      + '<input class="fc" type="number" min="1" value="' + it.qty + '" style="font-size:.78rem;" oninput="aptChQty(' + idx + ',this.value)"/>'
      + '<span style="font-size:.8rem;font-weight:600;">' + eur(it.price * it.qty) + '</span>'
      + '<button onclick="aptRmItem(' + idx + ')" style="background:var(--red-bg);border:1.5px solid rgba(239,68,68,.3);color:var(--red);border-radius:var(--r);padding:.3rem .5rem;cursor:pointer;font-size:.75rem;">x</button>'
      + '</div>';
  }).join('');
  calcAptTotals();
}

function aptChQty(idx, val) {
  var q = parseInt(val) || 1;
  if (q < 1) q = 1;
  _aptItems[idx].qty = q;
  calcAptTotals();
  renderAptItemsForm();
}
function aptRmItem(idx) {
  _aptItems.splice(idx, 1);
  renderAptItemsForm();
}

function onAptProdSearch(val) {
  var res = document.getElementById('aptProdResults');
  var co  = document.getElementById('aptCo2').value;
  if (!val || val.length < 1) { res.style.display = 'none'; return; }
  var prods = DB.prods().filter(function(p) {
    return p.co === co && (p.name.toLowerCase().includes(val.toLowerCase()) || p.bc.includes(val));
  }).slice(0, 8);
  if (!prods.length) { res.style.display = 'none'; return; }
  res.style.display = 'block';
  res.innerHTML = prods.map(function(p) {
    return '<div onclick="aptAddProd(\'' + p.id + '\')" style="padding:.42rem .7rem;cursor:pointer;border-bottom:1px solid var(--border);font-size:.8rem;display:flex;justify-content:space-between;gap:.5rem;" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'\'"> '
      + '<span>' + (p.emoji || '') + ' ' + p.name + '</span>'
      + '<span style="color:var(--accent);font-weight:700;">' + eur(p.price) + '</span>'
      + '</div>';
  }).join('');
}

function aptAddProd(id) {
  var p = DB.prods().find(function(x) { return x.id === id; });
  if (!p) return;
  var ex = _aptItems.find(function(i) { return i.id === id; });
  if (ex) { ex.qty++; }
  else { _aptItems.push({ id: p.id, name: p.name, price: p.price, emoji: p.emoji || '', qty: 1 }); }
  document.getElementById('aptProdSearch').value = '';
  document.getElementById('aptProdResults').style.display = 'none';
  renderAptItemsForm();
}

function calcAptTotals() {
  var co   = document.getElementById('aptCo2')?.value || S.co;
  var sub  = _aptItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var dp   = parseFloat(document.getElementById('aptDesc').value) || 0;
  var disc = sub * dp / 100;
  var net  = sub - disc;
  var tax  = net * taxRate(co);
  var tot  = net + tax;
  var ant  = parseFloat(document.getElementById('aptAnticipo').value) || 0;
  var resta = Math.max(0, tot - ant);
  document.getElementById('aptSumSub').textContent   = eur(sub);
  document.getElementById('aptSumDisc').textContent  = '-' + eur(disc);
  document.getElementById('aptSumTax').textContent   = eur(tax);
  document.getElementById('aptSumTot').textContent   = eur(tot);
  document.getElementById('aptSumResta').textContent = eur(resta);
  var taxLbl = document.getElementById('aptSumTaxLabel');
  if (taxLbl) taxLbl.textContent = taxLabel(co);
}

function openApartadoModal(aId) {
  _aptItems = [];
  _editAptId = aId || null;
  var modal = document.getElementById('mApartado');
  var title = document.getElementById('mAptTitle');

  // Rellenar clientes
  var sel = document.getElementById('aptCliente');
  sel.innerHTML = '<option value="">Cliente genérico</option>'
    + DB.clients().map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');

  if (aId) {
    var a = (S._apartados || []).find(function(x) { return x.id === aId; });
    if (!a) return;
    title.textContent = 'Editar Apartado ' + a.num;
    document.getElementById('aptCo2').value = a.co;
    sel.value = a.clientId || '';
    document.getElementById('aptFechaEntrega').value = a.fechaEntrega ? a.fechaEntrega.split('T')[0] : '';
    document.getElementById('aptNota').value = a.nota || '';
    document.getElementById('aptDesc').value = a.dp || 0;
    document.getElementById('aptAnticipo').value = a.anticipo || 0;
    _aptItems = a.items.map(function(i) { return Object.assign({}, i); });
  } else {
    title.textContent = 'Nuevo Apartado';
    document.getElementById('aptCo2').value = S.co;
    sel.value = '';
    document.getElementById('aptFechaEntrega').value = '';
    document.getElementById('aptNota').value = '';
    document.getElementById('aptDesc').value = 0;
    document.getElementById('aptAnticipo').value = 0;
  }
  renderAptItemsForm();
  calcAptTotals();
  modal.classList.remove('hidden');
}
var _editAptId = null;

async function guardarApartado() {
  if (!_aptItems.length) { toast('Agrega al menos un producto', 'wrn'); return; }
  var co  = document.getElementById('aptCo2').value;
  var cId = document.getElementById('aptCliente').value;
  var cNm = cId ? (DB.clients().find(function(c) { return c.id === cId; })?.name || 'Genérico') : 'Genérico';
  var dp  = parseFloat(document.getElementById('aptDesc').value) || 0;
  var ant = parseFloat(document.getElementById('aptAnticipo').value) || 0;
  var sub = _aptItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var disc = sub * dp / 100;
  var net  = sub - disc;
  var tax  = net * taxRate(co);
  var tot  = net + tax;
  var resta = Math.max(0, tot - ant);
  var fe  = document.getElementById('aptFechaEntrega').value || null;
  var nota = document.getElementById('aptNota').value.trim() || null;

  var a = {
    id: _editAptId || uid(),
    co, num: _editAptId ? ((S._apartados || []).find(function(x) { return x.id === _editAptId; })?.num || makeAptNum()) : makeAptNum(),
    clientId: cId, clientName: cNm,
    items: _aptItems.map(function(i) { return Object.assign({}, i); }),
    sub, disc, dp, tax, tot, anticipo: ant, resta,
    estado: _editAptId ? ((S._apartados || []).find(function(x) { return x.id === _editAptId; })?.estado || 'pendiente') : 'pendiente',
    fechaEntrega: fe, nota,
    tsCreacion: _editAptId ? ((S._apartados || []).find(function(x) { return x.id === _editAptId; })?.tsCreacion || new Date().toISOString()) : new Date().toISOString(),
    tsEntrega: null
  };

  try {
    var idx = (S._apartados || []).findIndex(function(x) { return x.id === a.id; });
    if (idx !== -1) {
      S._apartados[idx] = a;
      await supa.upsert('apartados', toDBApd(a));
    } else {
      S._apartados.unshift(a);
      await supa.insert('apartados', toDBApd(a));
    }
    document.getElementById('mApartado').classList.add('hidden');
    renderApartados();
    toast('Apartado ' + a.num + ' guardado', 'ok');
    await trace('apartado', co, 'Apartado ' + a.num + ' - ' + cNm, _aptItems.length + ' productos - ' + eur(tot));
  } catch(e) { toast('Error al guardar: ' + e.message, 'err'); console.error(e); }
}

// ---- Cobrar apartado ----
var _cobrarAptId = null;

function abrirCobrarApt(id) {
  var a = (S._apartados || []).find(function(x) { return x.id === id; });
  if (!a) return;
  _cobrarAptId = id;
  var html = '<div style="display:flex;flex-direction:column;gap:.75rem;">'
    + '<div style="background:var(--bg);border-radius:var(--r);padding:.75rem;">'
    + '<div style="font-size:.7rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">Resumen</div>'
    + '<div style="display:flex;justify-content:space-between;font-size:.82rem;"><span>Apartado</span><strong>' + a.num + '</strong></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:.82rem;"><span>Cliente</span><strong>' + a.clientName + '</strong></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:.82rem;"><span>Total apartado</span><strong>' + eur(a.tot) + '</strong></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:.82rem;"><span>Anticipo pagado</span><strong style="color:var(--green);">' + eur(a.anticipo) + '</strong></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:800;color:var(--accent);border-top:1.5px solid var(--border);padding-top:.35rem;margin-top:.25rem;"><span>Resta por cobrar</span><span>' + eur(a.resta) + '</span></div>'
    + '</div>'
    + '<div><label style="font-size:.78rem;font-weight:600;color:var(--text-2);display:block;margin-bottom:.3rem;">Método de pago</label>'
    + '<select id="cobAptPay" class="fc">'
    + '<option value="efectivo">Efectivo</option>'
    + '<option value="datafono">Datáfono</option>'
    + '<option value="wero">Wero</option>'
    + '<option value="rib">RIB Empresa</option>'
    + '</select></div>'
    + '<div id="cobAptEfectivoBlock">'
    + '<label style="font-size:.78rem;font-weight:600;color:var(--text-2);display:block;margin-bottom:.3rem;">Efectivo recibido</label>'
    + '<input id="cobAptEfectivo" class="fc" type="number" placeholder="0.00" step="0.01" min="0" value="' + a.resta.toFixed(2) + '" oninput="cobAptCalcCambio()"/>'
    + '<div style="display:flex;justify-content:space-between;font-size:.85rem;font-weight:700;color:var(--green);margin-top:.35rem;"><span>Cambio</span><span id="cobAptCambio">€0.00</span></div>'
    + '</div></div>';
  document.getElementById('cobrarAptContent').innerHTML = html;
  document.getElementById('cobAptPay').addEventListener('change', function() {
    document.getElementById('cobAptEfectivoBlock').style.display = this.value === 'efectivo' ? 'block' : 'none';
  });
  cobAptCalcCambio();
  document.getElementById('mCobrarApt').classList.remove('hidden');
}

function cobAptCalcCambio() {
  var a = (S._apartados || []).find(function(x) { return x.id === _cobrarAptId; });
  if (!a) return;
  var rec = parseFloat(document.getElementById('cobAptEfectivo')?.value) || 0;
  var cambio = rec - a.resta;
  var el = document.getElementById('cobAptCambio');
  if (el) { el.textContent = eur(Math.max(0, cambio)); el.style.color = cambio >= 0 ? 'var(--green)' : 'var(--red)'; }
}

async function confirmarCobrarApt() {
  var a = (S._apartados || []).find(function(x) { return x.id === _cobrarAptId; });
  if (!a) return;
  var pay = document.getElementById('cobAptPay').value;
  if (pay === 'efectivo') {
    var rec = parseFloat(document.getElementById('cobAptEfectivo').value) || 0;
    if (rec < a.resta - 0.001) { toast('Efectivo insuficiente', 'err'); return; }
  }

  // Marcar como entregado
  a.estado     = 'entregado';
  a.tsEntrega  = new Date().toISOString();
  a.anticipo   = a.tot; // ya se pagó todo
  a.resta      = 0;

  try {
    var idx = S._apartados.findIndex(function(x) { return x.id === a.id; });
    if (idx !== -1) S._apartados[idx] = a;
    await supa.upsert('apartados', toDBApd(a));

    // Descontar stock
    var prods = DB.prods();
    for (var it of a.items) {
      var p = prods.find(function(x) { return x.id === it.id; });
      if (p) {
        p.stock = Math.max(0, p.stock - it.qty);
        p.lastSale = new Date().toISOString();
        await supa.update('productos', p.id, { stock: p.stock, last_sale: p.lastSale });
      }
    }

    // Registrar como venta
    var invNum = makeInvNum ? makeInvNum() : ('APT-' + a.num);
    var v = {
      id: uid(), invNum, co: a.co,
      clientId: a.clientId, clientName: a.clientName,
      items: a.items.map(function(i) { return Object.assign({}, i); }),
      sub: a.sub, disc: a.disc, dp: a.dp, tax: a.tax, tot: a.tot,
      pay: pay, vendedor: '', nota: 'Apartado ' + a.num,
      cashRec: pay === 'efectivo' ? (parseFloat(document.getElementById('cobAptEfectivo').value) || a.tot) : null,
      ts: new Date().toISOString()
    };
    await save.venta(v);

    document.getElementById('mCobrarApt').classList.add('hidden');
    renderApartados();
    burst();
    toast('Apartado ' + a.num + ' cobrado y entregado!', 'ok');
    await trace('apartado_cobrado', a.co, 'Cobro apartado ' + a.num + ' - ' + a.clientName, eur(a.tot) + ' - ' + pay);
    setTimeout(function() { showInvoice(v); }, 350);
  } catch(e) { toast('Error: ' + e.message, 'err'); console.error(e); }
}

async function cancelarApartado(id) {
  var a = (S._apartados || []).find(function(x) { return x.id === id; });
  if (!a) return;
  if (!confirm('¿Cancelar el apartado ' + a.num + '?')) return;
  a.estado = 'cancelado';
  try {
    var idx = S._apartados.findIndex(function(x) { return x.id === id; });
    if (idx !== -1) S._apartados[idx] = a;
    await supa.upsert('apartados', toDBApd(a));
    renderApartados();
    toast('Apartado cancelado', 'wrn');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

function renderApartados() {
  var srch   = (document.getElementById('aptSrch')?.value || '').toLowerCase();
  var estado = document.getElementById('aptEstado')?.value || 'all';
  var co     = document.getElementById('aptCo')?.value || 'all';
  var apts   = (S._apartados || []).filter(function(a) {
    return (estado === 'all' || a.estado === estado)
      && (co === 'all' || a.co === co)
      && (!srch || a.clientName.toLowerCase().includes(srch) || a.num.toLowerCase().includes(srch));
  });

  // KPIs
  var pending = (S._apartados || []).filter(function(a) { return a.estado === 'pendiente'; });
  var entregados = (S._apartados || []).filter(function(a) { return a.estado === 'entregado'; });
  var totalResta = pending.reduce(function(s, a) { return s + a.resta; }, 0);
  var totalAnt   = pending.reduce(function(s, a) { return s + a.anticipo; }, 0);
  var kp = document.getElementById('aptKPend');    if (kp) kp.textContent = pending.length;
  var ke = document.getElementById('aptKEnt');     if (ke) ke.textContent = entregados.length;
  var kr = document.getElementById('aptKResta');   if (kr) kr.textContent = eur(totalResta);
  var ka = document.getElementById('aptKAnticipo');if (ka) ka.textContent = eur(totalAnt);

  // Tabla
  var tb = document.getElementById('aptTbody');
  if (!tb) return;
  if (!apts.length) {
    tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-3)">Sin apartados</td></tr>';
    return;
  }
  var estadoTag = { pendiente: 'tag-low', entregado: 'tag-ok', cancelado: 'tag-out' };
  var estadoLbl = { pendiente: 'Pendiente', entregado: 'Entregado', cancelado: 'Cancelado' };
  tb.innerHTML = apts.map(function(a) {
    var prods = a.items.slice(0, 3).map(function(i) { return (i.emoji || '') + ' ' + i.name + ' x' + i.qty; }).join(', ');
    if (a.items.length > 3) prods += ' ...+' + (a.items.length - 3) + ' más';
    var acciones = '';
    if (a.estado === 'pendiente') {
      acciones += '<button class="btn btn-pri" style="font-size:.7rem;padding:.28rem .6rem;" onclick="abrirCobrarApt(\'' + a.id + '\')">Cobrar</button> ';
      acciones += '<button class="btn btn-sec" style="font-size:.7rem;padding:.28rem .6rem;" onclick="openApartadoModal(\'' + a.id + '\')">Editar</button> ';
      acciones += '<button class="btn btn-sec" style="font-size:.7rem;padding:.28rem .6rem;color:var(--red);" onclick="cancelarApartado(\'' + a.id + '\')">Cancelar</button>';
    } else {
      acciones = '<span style="color:var(--text-3);font-size:.75rem;">' + (a.estado === 'entregado' ? dtShort(a.tsEntrega || a.tsCreacion) : 'Cancelado') + '</span>';
    }
    return '<tr>'
      + '<td style="font-weight:700;color:var(--accent);">' + a.num + '</td>'
      + '<td>' + a.clientName + '</td>'
      + '<td><span class="tag tag-' + a.co + '" style="font-size:.65rem;">' + (a.co === 'sol' ? 'SL' : 'SP') + '</span></td>'
      + '<td style="font-size:.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + prods + '</td>'
      + '<td style="font-weight:700;">' + eur(a.tot) + '</td>'
      + '<td style="color:var(--green);">' + eur(a.anticipo) + '</td>'
      + '<td style="color:var(--red);font-weight:600;">' + eur(a.resta) + '</td>'
      + '<td style="font-size:.75rem;">' + (a.fechaEntrega ? dtShort(a.fechaEntrega) : '-') + '</td>'
      + '<td><span class="tag ' + (estadoTag[a.estado] || '') + '" style="font-size:.65rem;">' + (estadoLbl[a.estado] || a.estado) + '</span></td>'
      + '<td>' + acciones + '</td>'
      + '</tr>';
  }).join('');
}

window.openApartadoModal  = openApartadoModal;
window.guardarApartado    = guardarApartado;
window.abrirCobrarApt     = abrirCobrarApt;
window.confirmarCobrarApt = confirmarCobrarApt;
window.cancelarApartado   = cancelarApartado;
window.renderApartados    = renderApartados;
window.onAptProdSearch    = onAptProdSearch;
window.aptAddProd         = aptAddProd;
window.aptChQty           = aptChQty;
window.aptRmItem          = aptRmItem;
window.calcAptTotals      = calcAptTotals;
window.cobAptCalcCambio   = cobAptCalcCambio;

document.addEventListener('DOMContentLoaded', init);

//    SERVICE WORKER                                 
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) {
        console.log('[PWA] Service Worker registrado:', reg.scope);
        // Check for updates
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Nueva version disponible. Recarga la pagina para actualizar.', 'inf');
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[PWA] Service Worker error:', err);
      });
  });
}























