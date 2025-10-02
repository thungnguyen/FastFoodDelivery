const pool = require("../db");
const bcrypt = require("bcryptjs");

async function getUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
}

async function createUser({ username, email, password }) {
  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email`,
    [username, email, hashed]
  );
  return rows[0];
}

module.exports = { getUserByEmail, createUser };
