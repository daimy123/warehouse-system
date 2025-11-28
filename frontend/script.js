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