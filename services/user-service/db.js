const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "user-db",
  database: process.env.DB_NAME || "fastfood",
  password: process.env.DB_PASS || "postgres",
  port: process.env.DB_PORT || 5432,
});

module.exports = pool;
