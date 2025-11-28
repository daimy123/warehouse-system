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