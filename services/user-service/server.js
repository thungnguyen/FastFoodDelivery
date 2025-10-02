const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("User Service is running 🚀");
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
