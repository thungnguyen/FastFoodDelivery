const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// Dữ liệu mẫu
const orders = [
  { id: 1, item: "Pizza", status: "ordering" },
  { id: 2, item: "Burger", status: "processing" },
];

// Lấy tất cả orders
app.get("/orders", (req, res) => {
  res.json(orders);
});

// Lấy order theo id
app.get("/orders/:id", (req, res) => {
  const id = parseInt(req.params.id); // req.params.id là string, nên parseInt
  const order = orders.find(o => o.id === id);

  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: "Order not found" });
  }
});

app.listen(4001, () => {
  console.log("Order Service running on port 4001");
});
