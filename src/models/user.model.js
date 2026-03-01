const pool = require("../config/db");

async function getDeletedAtByEmail(email) {
  const { rows } = await pool.query(
    `SELECT deleted_at FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return rows[0]?.deleted_at ?? null;
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, role, approved_at, deleted_at, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function findForAdminLogin(email) {
  const { rows } = await pool.query(
    `SELECT id, email, role, password_hash, deleted_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function insertUser(client, { email, role = "user" }) {
  const { rows } = await client.query(
    `INSERT INTO users (email, role, approved_at, created_at)
     VALUES ($1, $2, NULL, NOW())
     RETURNING id`,
    [email, role],
  );
  return rows[0].id;
}

async function insertUserProfile(
  client,
  { userId, fullName, address, contactNumber },
) {
  await client.query(
    `INSERT INTO user_profiles (user_id, full_name, address, contact_number)
     VALUES ($1, $2, $3, $4)`,
    [userId, fullName, address, contactNumber],
  );
}
async function listUsersKeyset({
  limit,
  cursorObj = null,
  includeDeleted = false,
  q = null,
} = {}) {
  const where = [];
  const params = [];

  if (!includeDeleted) {
    where.push(`u.deleted_at IS NULL`);
  }

  if (typeof q === "string" && q.trim()) {
    params.push(q.trim().toLowerCase() + "%");
    where.push(`LOWER(u.email) LIKE $${params.length}`);
  }

  if (cursorObj) {
    params.push(cursorObj.created_at);
    params.push(cursorObj.id);
    where.push(
      `(u.created_at, u.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
    );
  }

  params.push(limit);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT
      u.id, u.email, u.role, u.approved_at, u.deleted_at, u.created_at
    FROM users u
    ${whereSql}
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = {
  pool,
  getDeletedAtByEmail,
  findByEmail,
  findForAdminLogin,
  insertUser,
  insertUserProfile,
  listUsersKeyset,
};
