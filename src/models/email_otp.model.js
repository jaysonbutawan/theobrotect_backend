const pool = require("../config/db");

async function getLatestOtpCreatedAt(email) {
  const res = await pool.query(
    `SELECT created_at
     FROM email_otps
     WHERE user_email = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return res.rows[0]?.created_at || null;
}

async function countOtpsInWindow(email, windowMinutes) {
  const mins = Number(windowMinutes);
  if (!Number.isFinite(mins) || mins <= 0) throw new Error("Invalid windowMinutes");

  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM email_otps
     WHERE user_email = $1
       AND created_at > NOW() - make_interval(mins => $2)`,
    [email, mins]
  );
  return res.rows[0]?.count ?? 0;
}

async function invalidateActiveOtps(email) {
  await pool.query(
    `UPDATE email_otps
     SET is_used = true
     WHERE user_email = $1 AND is_used = false`,
    [email]
  );
}

async function insertOtp({ email, otpHash, ttlSeconds }) {
  const ttl = Number(ttlSeconds);
  if (!Number.isFinite(ttl) || ttl <= 0) throw new Error("Invalid ttlSeconds");

  await pool.query(
    `INSERT INTO email_otps (user_email, otp_hash, expires_at, is_used, created_at)
     VALUES ($1, $2, NOW() + make_interval(secs => $3), false, NOW())`,
    [email, otpHash, ttl]
  );
}

async function getLatestActiveOtp(email) {
  const res = await pool.query(
    `SELECT id, otp_hash, expires_at
     FROM email_otps
     WHERE user_email = $1 AND is_used = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return res.rows[0] || null;
}

async function markOtpUsed(id) {
  await pool.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [id]);
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
  getLatestOtpCreatedAt,
  countOtpsInWindow,
  invalidateActiveOtps,
  insertOtp,
  getLatestActiveOtp,
  markOtpUsed,
  getDeletedAtByEmail,
};
