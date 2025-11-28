const API = 'http://localhost:3000/products';
let selectedId = null;
const lowThreshold = 10;

async function fetchProducts(q='', sort='') {
  let url = API;
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
  const products = await fetchProducts(q, sort);
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = products.map(rowHtml).join('') || '<tr><td colspan="6" style="color:var(--muted)">No products</td></tr>';
  document.getElementById('total').textContent = products.length;
}