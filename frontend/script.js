// automatic API resolver: tries localhost first, then Codespaces-style forwarded host
let selectedId = null;
const lowThreshold = 10;

async function tryFetchUrl(url) {
  try {
    const res = await fetch(url, {method: 'GET'});
    if (res.ok) return res;
    // non-ok (404/500) — treat as failure here
    return null;
  } catch (e) {
    return null;
  }
}

async function resolveApiBase() {
  // candidate 1: localhost
  const candidates = [
    'http://localhost:3000'
  ];

  // candidate 2: replace trailing "-<port>" in current host with "-3000"
  try {
    const loc = window.location;
    const host = loc.hostname; // e.g. symmetrical-spork-xxxxx-45667.app.github.dev
    const hostParts = host.split('.');
    if (hostParts.length >= 2) {
      const prefix = hostParts[0]; // e.g. symmetrical-spork-xxxxx-45667
      const rest = hostParts.slice(1).join('.');
      // replace trailing -digits with -3000
      const replacedPrefix = prefix.replace(/-\d+$/, '-3000');
      if (replacedPrefix !== prefix) {
        const candidateHost = `${replacedPrefix}.${rest}`;
        const candidateOrigin = `${loc.protocol}//${candidateHost}`;
        candidates.push(candidateOrigin);
      }
      // also try origin with port 3000 if current origin has a port
      if (loc.port && loc.port !== '3000') {
        const originWith3000 = `${loc.protocol}//${loc.hostname}:3000`;
        candidates.push(originWith3000);
      }
    }
  } catch (e) {
    // ignore
  }

  // try each candidate by checking /products
  for (const base of candidates) {
    const url = `${base.replace(/\/+$/, '')}/products`;
    const ok = await tryFetchUrl(url);
    if (ok) {
      // return the base (no trailing slash)
      return base.replace(/\/+$/, '');
    }
  }

  // final fallback: use the original localhost (even if unreachable)
  return 'http://localhost:3000';
}

// We'll initialize API_BASE once (on load) and reuse it.
let API_BASE_PROMISE = null;
function getApiBasePromise() {
  if (!API_BASE_PROMISE) API_BASE_PROMISE = resolveApiBase();
  return API_BASE_PROMISE;
}

async function fetchProducts(q='', sort='') {
  const base = await getApiBasePromise();
  let url = `${base.replace(/\/+$/, '')}/products`;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);
  const full = url + (params.toString() ? '?'+params.toString() : '');
  const res = await fetch(full);
  return res.json();
}

function rowHtml(p){
  const low = p.quantity < lowThreshold;
  return `<tr data-id="${p.id}">
    <td>${escapeHtml(p.name)}</td>
    <td>${escapeHtml(p.category)}</td>
    <td>${low ? `<span class="low">${p.quantity}</span>` : p.quantity}</td>
    <td>${escapeHtml(p.location)}</td>
    <td>${escapeHtml(p.supplier)}</td>
    <td class="actions">
      <button class="select">Select</button>
      <button class="edit">Edit</button>
      <button class="del">Delete</button>
    </td>
  </tr>`;
}

function escapeHtml(s){ return (s===undefined||s===null)? '' : String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

async function load(q='', sort=''){
  try {
    const products = await fetchProducts(q, sort);
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = products.map(rowHtml).join('') || '<tr><td colspan="6" style="color:var(--muted)">No products</td></tr>';
    document.getElementById('total').textContent = products.length;
  } catch (err) {
    console.error('Failed to load products', err);
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">Unable to contact backend</td></tr>';
    document.getElementById('total').textContent = '0';
  }
}

async function addProduct(){
  const body = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    quantity: Number(document.getElementById('quantity').value || 0),
    location: document.getElementById('location').value.trim(),
    supplier: document.getElementById('supplier').value.trim()
  };
  if(!body.name){ alert('Name required'); return; }
  const base = await getApiBasePromise();
  const r = await fetch(`${base}/products`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  if(!r.ok){ const err = await r.json().catch(()=>({error:'unknown'})); alert(err.error || 'Add failed'); return; }
  clearForm(); load();
}

async function updateProduct(){
  if(!selectedId){ alert('Select a product first (Select button)'); return; }
  const body = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    quantity: Number(document.getElementById('quantity').value || 0),
    location: document.getElementById('location').value.trim(),
    supplier: document.getElementById('supplier').value.trim()
  };
  const base = await getApiBasePromise();
  const r = await fetch(`${base}/products/${selectedId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  if(!r.ok){ const err = await r.json().catch(()=>({error:'unknown'})); alert(err.error || 'Update failed'); return; }
  clearForm(); selectedId=null; load();
}

function clearForm(){
  ['name','category','quantity','location','supplier'].forEach(id=>document.getElementById(id).value='');
  selectedId = null;
}

document.addEventListener('click', async (e)=>{
  if(e.target.matches('#addBtn')) return addProduct();
  if(e.target.matches('#updateBtn')) return updateProduct();
  if(e.target.matches('#clearBtn')) return clearForm();
  if(e.target.matches('#refreshBtn')) return load();
  if(e.target.matches('#searchBtn')) {
    const q = document.getElementById('search').value.trim();
    const sort = document.getElementById('sort').value;
    return load(q, sort);
  }
  if(e.target.matches('#sort')) return load(document.getElementById('search').value.trim(), e.target.value);
  if(e.target.matches('#exportBtn')){
    const products = await fetchProducts();
    const blob = new Blob([JSON.stringify(products, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.json'; a.click(); URL.revokeObjectURL(url);
    return;
  }

  if(e.target.matches('.del')){
    const tr = e.target.closest('tr'); const id = tr.dataset.id;
    if(!confirm('Delete?')) return;
    const base = await getApiBasePromise();
    await fetch(`${base}/products/${id}`, {method:'DELETE'}); load();
  }

  if(e.target.matches('.edit')){
    const tr = e.target.closest('tr'); const id = tr.dataset.id;
    const base = await getApiBasePromise();
    const res = await fetch(`${base}/products/${id}`); const p = await res.json();
    document.getElementById('name').value = p.name || '';
    document.getElementById('category').value = p.category || '';
    document.getElementById('quantity').value = p.quantity || 0;
    document.getElementById('location').value = p.location || '';
    document.getElementById('supplier').value = p.supplier || '';
    selectedId = id;
  }

  if(e.target.matches('.select')){
    const tr = e.target.closest('tr'); const id = tr.dataset.id;
    // highlight selected row (simple)
    document.querySelectorAll('#productsTable tr').forEach(r=>r.style.background='transparent');
    tr.style.background='rgba(6,182,212,0.06)';
    selectedId = id;
  }
});

window.addEventListener('load', ()=> load());
