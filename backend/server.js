// backend/server.js
const express = require('express');
const cors = require('cors'); // optional; keep for dev if needed
const fs = require('fs').promises;
const path = require('path');

const app = express();

// keep CORS for dev convenience (safe if you later restrict to your domain)
app.use(cors());
app.options('*', cors());

app.use(express.json());

const DATA_PATH = path.join(__dirname, 'products.json');

async function readData() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DATA_PATH, '[]', 'utf8');
      return [];
    }
    throw err;
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/* API routes (unchanged) */
app.get('/products', async (req, res) => {
  try {
    let products = await readData();
    const { q, sort } = req.query;

    if (q) {
      const term = q.toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    }

    if (sort === 'quantity_asc') products.sort((a,b)=> a.quantity - b.quantity);
    if (sort === 'quantity_desc') products.sort((a,b)=> b.quantity - a.quantity);

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read products' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const products = await readData();
    const prod = products.find(p => String(p.id) === String(req.params.id));
    if (!prod) return res.status(404).json({ error: 'Not found' });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, category, quantity = 0, location = '', supplier = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (Number(quantity) < 0) return res.status(400).json({ error: 'Quantity cannot be negative' });

    const products = await readData();
    const newProduct = {
      id: Date.now().toString(),
      name,
      category,
      quantity: Number(quantity),
      location,
      supplier,
      updatedDate: new Date().toISOString()
    };
    products.push(newProduct);
    await writeData(products);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const products = await readData();
    const idx = products.findIndex(p => String(p.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    // merge update fields (basic)
    const updated = { ...products[idx], ...req.body, updatedDate: new Date().toISOString() };
    products[idx] = updated;
    await writeData(products);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    let products = await readData();
    const before = products.length;
    products = products.filter(p => String(p.id) !== String(req.params.id));
    if (products.length === before) return res.status(404).json({ error: 'Not found' });
    await writeData(products);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

/* ---- Serve frontend static files ---- */
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_PATH));

// SPA fallback — always serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

/* Start server using PORT from env (Render sets PORT) */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
