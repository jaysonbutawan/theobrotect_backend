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
  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM email_otps
     WHERE user_email = $1
     AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [email]
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
  await pool.query(
    `INSERT INTO email_otps
     (user_email, otp_hash, expires_at, is_used, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '${ttlSeconds} seconds', false, NOW())`,
    [email, otpHash]
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

module.exports = {
  getLatestOtpCreatedAt,
  countOtpsInWindow,
  invalidateActiveOtps,
  insertOtp,
  getLatestActiveOtp,
  markOtpUsed,
};
