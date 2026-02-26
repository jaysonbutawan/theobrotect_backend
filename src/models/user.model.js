// models/user.model.js
const pool = require("../config/db");

/**
 * Simple email validator (same as controller)
 * Keep here so it's reusable / testable.
 */
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* -------- Low level functions (accept a client) -------- */

async function findByEmail(client, email) {
  const q = `SELECT id, deleted_at FROM users WHERE email = $1 LIMIT 1`;
  const { rows } = await client.query(q, [email]);
  return rows[0] || null;
}

async function insertUser(client, email, role = "user") {
  const q = `
    INSERT INTO users (email, role, approved_at, created_at)
    VALUES ($1, $2, NULL, NOW())
    RETURNING id
  `;
  const { rows } = await client.query(q, [email, role]);
  return rows[0].id;
}

async function insertUserProfile(client, userId, fullName, address, contactNumber) {
  const q = `
    INSERT INTO user_profiles (user_id, full_name, address, contact_number)
    VALUES ($1, $2, $3, $4)
  `;
  await client.query(q, [userId, fullName, address, contactNumber]);
}

/* -------- High level convenience function (manages its own transaction) -------- */

async function registerUser({ email, fullName, address, contact }) {
  if (!isValidEmail(email) || !fullName || !address || !contact) {
    const err = new Error("INVALID_INPUT");
    err.code = "INVALID_INPUT";
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await findByEmail(client, email);
    if (existing) {
      const err = new Error("ALREADY_REGISTERED");
      err.code = "ALREADY_REGISTERED";
      throw err;
    }

    const userId = await insertUser(client, email);
    await insertUserProfile(client, userId, fullName, address, contact);

    await client.query("COMMIT");
    return { status: "PENDING_APPROVAL", userId };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) { /* swallow rollback err */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  isValidEmail,
  // low-level
  findByEmail,
  insertUser,
  insertUserProfile,
  // high-level
  registerUser,
};