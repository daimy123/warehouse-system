// frontend/script.js - uses same-origin API at /products
const API = '/products';
let selectedId = null;
const lowThreshold = 10;

function escapeHtml(s){ return (s===undefined||s===null)? '' : String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

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

// safe JSON parse: returns object or { __rawText: '...' }
async function safeJsonResponse(res){
  const text = await res.text().catch(()=>null);
  try { return text ? JSON.parse(text) : {}; } catch(e){ return { __rawText: text || '' }; }
}

// small fetch retry wrapper for transient failures
async function fetchWithRetry(url, opts={}, retries=1, delay=400){
  try {
    return await fetch(url, opts);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r=>setTimeout(r, delay));
    return fetchWithRetry(url, opts, retries-1, delay);
  }
}

async function fetchProducts(q='', sort='') {
  let url = API;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);
  const full = url + (params.toString() ? '?'+params.toString() : '');
  const res = await fetchWithRetry(full, {}, 1);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
  return res.json();
}

async function load(q='', sort=''){
  try {
    const products = await fetchProducts(q, sort);
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = products.map(rowHtml).join('') || '<tr><td colspan="6" style="color:var(--muted)">No products</td></tr>';
    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = products.length;
  } catch (err) {
    console.error('Failed to load products', err);
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">Unable to contact backend</td></tr>';
    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = '0';
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
  const res = await fetchWithRetry(API, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}, 1);
  if(!res.ok){
    const parsed = await safeJsonResponse(res);
    const message = parsed && parsed.error ? parsed.error : (parsed.__rawText || `${res.status} ${res.statusText}`);
    alert('Add failed: ' + message);
    return;
  }
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
  const res = await fetchWithRetry(`${API}/${selectedId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}, 1);
  if(!res.ok){
    const parsed = await safeJsonResponse(res);
    const message = parsed && parsed.error ? parsed.error : (parsed.__rawText || `${res.status} ${res.statusText}`);
    alert('Update failed: ' + message);
    return;
  }
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
    await fetchWithRetry(`${API}/${id}`, {method:'DELETE'}, 1);
    load();
  }

  if(e.target.matches('.edit')){
    const tr = e.target.closest('tr'); const id = tr.dataset.id;
    const res = await fetchWithRetry(`${API}/${id}`, {}, 1);
    if(!res.ok){ alert('Failed to fetch product'); return; }
    const p = await res.json();
    document.getElementById('name').value = p.name || '';
    document.getElementById('category').value = p.category || '';
    document.getElementById('quantity').value = p.quantity || 0;
    document.getElementById('location').value = p.location || '';
    document.getElementById('supplier').value = p.supplier || '';
    selectedId = id;
  }

  if(e.target.matches('.select')){
    const tr = e.target.closest('tr'); const id = tr.dataset.id;
    document.querySelectorAll('#productsTable tr').forEach(r=>r.style.background='transparent');
    tr.style.background='rgba(6,182,212,0.06)';
    selectedId = id;
  }
});

window.addEventListener('load', ()=> load());
