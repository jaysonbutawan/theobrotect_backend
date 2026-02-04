const pool = require("../config/db");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.register = async (req, res) => {
  const client = await pool.connect();
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const fullName = (req.body?.full_name || "").trim();
    const address = (req.body?.address || "").trim();
    const contact = (req.body?.contact_number || "").trim();

    if (!isValidEmail(email) || !fullName || !address || !contact) {
      return res.status(400).json({ status: "INVALID_INPUT" });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, deleted_at FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ status: "ALREADY_REGISTERED" });
    }

    const userInsert = await client.query(
      `INSERT INTO users (email, role, approved_at, created_at)
       VALUES ($1, 'user', NULL, NOW())
       RETURNING id`,
      [email]
    );

    await client.query(
      `INSERT INTO user_profiles (user_id, full_name, address, contact_number)
       VALUES ($1, $2, $3, $4)`,
      [userInsert.rows[0].id, fullName, address, contact]
    );

    await client.query("COMMIT");
    return res.status(201).json({ status: "PENDING_APPROVAL" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("register error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  } finally {
    client.release();
  }
};
