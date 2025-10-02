const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Test server
app.get('/', (req, res) => {
  res.send('User Service is running!');
});

// Lấy danh sách user (fake)
app.get('/users', (req, res) => {
  const users = [
    { id: 1, name: "Nguyen Van A", role: "customer" },
    { id: 2, name: "Tran Thi B", role: "restaurant" },
  ];
  res.json(users);
});

// Đăng ký user mới
app.post('/users', (req, res) => {
  const { name, role } = req.body;
  const newUser = { id: Date.now(), name, role };
  res.status(201).json({ message: "User created", user: newUser });
});

app.listen(PORT, () => {
  console.log(`🚀 User Service running on http://localhost:${PORT}`);
});
