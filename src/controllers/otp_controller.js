const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300); 
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 50); 
const OTP_MAX_PER_WINDOW = Number(process.env.OTP_MAX_PER_WINDOW || 3); 
const OTP_WINDOW_MINUTES = Number(process.env.OTP_WINDOW_MINUTES || 10); 
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

function isValidEmail(email) {
  return (
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function generateOtp6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signJwt(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

exports.requestOtp = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ status: "INVALID_EMAIL" });
    }

    const userResult = await pool.query(
      `SELECT id, email, role, approved_at, deleted_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    if (userResult.rows.length > 0 && userResult.rows[0].deleted_at) {
      return res.status(403).json({ status: "ACCOUNT_DELETED" });
    }

    const lastOtp = await pool.query(
      `SELECT created_at
       FROM email_otps
       WHERE user_email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email],
    );

    if (lastOtp.rows.length > 0) {
      const lastCreatedAt = new Date(lastOtp.rows[0].created_at).getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastCreatedAt) / 1000);

      if (diffSeconds < OTP_COOLDOWN_SECONDS) {
        return res.status(429).json({
          status: "COOLDOWN",
          retry_after_seconds: OTP_COOLDOWN_SECONDS - diffSeconds,
        });
      }
    }

    const countInWindow = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM email_otps
       WHERE user_email = $1
         AND created_at > NOW() - ($2 || ' minutes')::interval`,
      [email, OTP_WINDOW_MINUTES.toString()],
    );

    if (countInWindow.rows[0].count >= OTP_MAX_PER_WINDOW) {
      return res.status(429).json({
        status: "TOO_MANY_REQUESTS",
        window_minutes: OTP_WINDOW_MINUTES,
        max_requests: OTP_MAX_PER_WINDOW,
      });
    }

    await pool.query(
      `UPDATE email_otps
       SET is_used = true
       WHERE user_email = $1 AND is_used = false`,
      [email],
    );

    const otp = generateOtp6();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

    await pool.query(
      `INSERT INTO email_otps (user_email, otp_hash, expires_at, is_used, created_at)
       VALUES ($1, $2, NOW() + ($3 || ' seconds')::interval, false, NOW())`,
      [email, otpHash, OTP_TTL_SECONDS.toString()],
    );

    await transporter.verify();
    await transporter.sendMail({
      from: `"TheobroTect Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your One-Time Password (OTP)",
      text: `Hello,

Here is your One-Time Password (OTP):

${otp}

Please DO NOT share this OTP with anyone.
This code will expire in ${OTP_TTL_SECONDS} seconds.

If you did not request this, please ignore this email.

– TheobroTect Team`,
    });

    console.log("OTP (DEV ONLY):", otp);

    return res.status(200).json({
      status: "OTP_SENT",
      expires_in_seconds: OTP_TTL_SECONDS,
    });
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({
      status: "SERVER_ERROR",
      error: err.message,
      code: err.code,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const otp = (req.body.otp || "").trim();

    if (!isValidEmail(email) || otp.length !== 6) {
      return res.status(400).json({ status: "INVALID_INPUT" });
    }

    const otpResult = await pool.query(
      `SELECT id, otp_hash, expires_at, is_used
       FROM email_otps
       WHERE user_email = $1 AND is_used = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [email],
    );

    if (otpResult.rows.length === 0) {
      return res.status(410).json({ status: "NO_ACTIVE_OTP" });
    }

    const otpRow = otpResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(otpRow.expires_at);

    if (now > expiresAt) {
      await pool.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [
        otpRow.id,
      ]);
      return res.status(410).json({ status: "OTP_EXPIRED" });
    }

    const isMatch = await bcrypt.compare(otp, otpRow.otp_hash);
    if (!isMatch) {
      return res.status(400).json({ status: "INVALID_OTP" });
    }

    await pool.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [
      otpRow.id,
    ]);

    const userResult = await pool.query(
      `SELECT id, email, role, approved_at, deleted_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({ status: "NEW_USER_REQUIRED" });
    }

    const user = userResult.rows[0];

    if (user.deleted_at) {
      return res.status(403).json({ status: "ACCOUNT_DELETED" });
    }

    if (user.role !== "admin" && !user.approved_at) {
      return res.status(403).json({ status: "PENDING_APPROVAL" });
    }

    const token = signJwt(user);
    return res.status(200).json({
      status: "OK",
      token,
      role: user.role,
    });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};
