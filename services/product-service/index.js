const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Product Service is running!');
});

// Danh sách sản phẩm
app.get('/products', (req, res) => {
  const products = [
    { id: 101, name: "Pizza", price: 100000 },
    { id: 102, name: "Burger", price: 50000 },
  ];
  res.json(products);
});

// Thêm sản phẩm mới
app.post('/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = { id: Date.now(), name, price };
  res.status(201).json({ message: "Product created", product: newProduct });
});

app.listen(PORT, () => {
  console.log(`🚀 Product Service running on http://localhost:${PORT}`);
});
