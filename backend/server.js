// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
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

/**
 * GET /products
 * Optional query: ?q=searchTerm (name or category), ?sort=quantity_asc|quantity_desc
 */
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