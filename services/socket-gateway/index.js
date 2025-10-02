const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// Tạo HTTP server
const server = http.createServer(app);

// Tạo socket server
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép mọi frontend kết nối (có thể fix domain cụ thể sau)
    methods: ["GET", "POST"],
  },
});

// Lắng nghe sự kiện từ client
io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Lắng nghe sự kiện order từ frontend
  socket.on("order_status_update", (data) => {
    console.log("📦 Order status update:", data);

    // Gửi cho tất cả client khác (broadcast)
    io.emit("order_status_changed", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Chạy server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket Gateway running on http://localhost:${PORT}`);
});
