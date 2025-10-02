const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
app.use(cors());

// User Service
app.use(
  "/api/users",
  createProxyMiddleware({
    target: "http://user-service:4001",
    changeOrigin: true,
  })
);

// Product Service
app.use(
  "/api/products",
  createProxyMiddleware({
    target: "http://product-service:4002",
    changeOrigin: true,
  })
);

// Order Service
app.use(
  "/api/orders",
  createProxyMiddleware({
    target: "http://order-service:4003",
    changeOrigin: true,
  })
);

// Payment Service
app.use(
  "/api/payments",
  createProxyMiddleware({
    target: "http://payment-service:4004",
    changeOrigin: true,
  })
);

// Default route
app.get("/", (req, res) => {
  res.send("🚀 FastFoodDelivery API Gateway is running...");
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
});
