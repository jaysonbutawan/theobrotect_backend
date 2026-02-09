const pool = require("../config/db");

async function findByEmail(email) {
  const res = await pool.query(
    `SELECT id, email, role, approved_at, deleted_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return res.rows[0] || null;
}

async function getDeletedAtByEmail(email) {
  const res = await pool.query(
    `SELECT deleted_at FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return res.rows[0]?.deleted_at || null;
}

module.exports = { findByEmail, getDeletedAtByEmail };
