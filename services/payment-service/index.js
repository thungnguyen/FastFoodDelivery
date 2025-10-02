const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Payment Service is running!');
});

// Thanh toán đơn hàng
app.post('/payments', (req, res) => {
  const { orderId, amount, method } = req.body;
  const payment = {
    id: Date.now(),
    orderId,
    amount,
    method,
    status: "success"
  };
  res.status(201).json({ message: "Payment successful", payment });
});

app.listen(PORT, () => {
  console.log(`🚀 Payment Service running on http://localhost:${PORT}`);
});
