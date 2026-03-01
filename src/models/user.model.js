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

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function encodeCursor(row) {
  const payload = { created_at: row.created_at, id: row.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) return null;

  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const obj = JSON.parse(raw);

    if (!obj?.created_at || !obj?.id) return null;
    return obj;
  } catch {
    return null;
  }
}


async function listUsersCursor({
  limit = 50,
  cursor = null,
  includeDeleted = false,     
  q = null,                  
} = {}) {
  const l = clampInt(limit, 1, 200, 50);
  const c = decodeCursor(cursor);

  const where = [];
  const params = [];

  if (!includeDeleted) {
    where.push(`u.deleted_at IS NULL`);
  }

  if (typeof q === "string" && q.trim()) {
    params.push(q.trim().toLowerCase() + "%");
    where.push(`LOWER(u.email) LIKE $${params.length}`);
  }

  if (c) {
    params.push(c.created_at);
    params.push(c.id);
    where.push(`(u.created_at, u.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
  }

  params.push(l);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT
      u.id, u.email, u.approved_at, u.deleted_at, u.created_at
    FROM users u
    ${whereSql}
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);

  const nextCursor = rows.length === l ? encodeCursor(rows[rows.length - 1]) : null;

  return {
    items: rows,
    next_cursor: nextCursor,
    limit: l,
  };
}

module.exports = {
  isValidEmail,
  findByEmail,
  insertUser,
  insertUserProfile,
  registerUser,
  getDeletedAtByEmail,
  listUsersCursor,
};