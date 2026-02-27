const pool = require("../config/db");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findByEmail(clientOrEmail, maybeEmail) {
  let client;
  let email;

  if (typeof clientOrEmail === "string" && maybeEmail === undefined) {
    client = pool;
    email = clientOrEmail;
  } else {
    client = clientOrEmail;
    email = maybeEmail;
  }

  if (!client || typeof client.query !== "function") {
    throw new Error("findByEmail: invalid db client (missing .query)");
  }

  const q = `
    SELECT id, email, role, approved_at, deleted_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
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
    try { await client.query("ROLLBACK"); } catch (e) {
      console.error("Error rolling back transaction:", e?.stack || e);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function getDeletedAtByEmail(email) {
  const res = await pool.query(
    `SELECT deleted_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return res.rows[0]?.deleted_at ?? null;
}

module.exports = {
  isValidEmail,
  findByEmail,
  insertUser,
  insertUserProfile,
  registerUser,
  getDeletedAtByEmail,
};