const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Định tuyến đến từng service ---

// User Service (http://localhost:4000)
app.use('/users', createProxyMiddleware({ target: 'http://localhost:4000', changeOrigin: true }));

// Order Service (http://localhost:4001)
app.use('/orders', createProxyMiddleware({ target: 'http://localhost:4001', changeOrigin: true }));

// Product Service (http://localhost:4002)
app.use('/products', createProxyMiddleware({ target: 'http://localhost:4002', changeOrigin: true }));

// Payment Service (http://localhost:4003)
app.use('/payments', createProxyMiddleware({ target: 'http://localhost:4003', changeOrigin: true }));

// Test route
app.get('/', (req, res) => {
  res.send('🚪 API Gateway is running on port 5000');
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
});
