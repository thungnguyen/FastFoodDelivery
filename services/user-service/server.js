const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "user-service" });
});

const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`User service listening on port ${port}`);
});
