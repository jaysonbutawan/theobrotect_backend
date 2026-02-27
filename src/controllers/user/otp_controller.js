// const pool = require("../../config/db");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");

// /* =========================
//    CONFIG
// ========================= */

// const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);
// const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 50);
// const OTP_MAX_PER_WINDOW = Number(process.env.OTP_MAX_PER_WINDOW || 3);
// const OTP_WINDOW_MINUTES = Number(process.env.OTP_WINDOW_MINUTES || 10);
// const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

// /* =========================
//    EMAIL TRANSPORTER
// ========================= */

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT || 587),
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   family: 4,
//   connectionTimeout: 10000,
//   socketTimeout: 10000,
// });

// /* =========================
//    HELPERS
// ========================= */

// function isValidEmail(email) {
//   return typeof email === "string"
//     && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
// }

// function generateOtp6() {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// function signJwt(user) {
//   return jwt.sign(
//     { user_id: user.id, email: user.email, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
//   );
// }

// async function sendOtpEmail(email, otp) {
//   return transporter.sendMail({
//     from: `"TheobroTect Security" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Your One-Time Password (OTP)",
//     text: `Your OTP is ${otp}. It expires in ${OTP_TTL_SECONDS} seconds.`,
//   });
// }

// /* =========================
//    REQUEST OTP
// ========================= */

// exports.requestOtp = async (req, res) => {
//   const email = (req.body?.email || "").trim().toLowerCase();

//   try {
//     if (!isValidEmail(email)) {
//       return res.status(400).json({ status: "INVALID_EMAIL" });
//     }

//     /* ---- Check user ---- */
//     const userRes = await pool.query(
//       `SELECT deleted_at FROM users WHERE email = $1 LIMIT 1`,
//       [email]
//     );

//     if (userRes.rows[0]?.deleted_at) {
//       return res.status(403).json({ status: "ACCOUNT_DELETED" });
//     }

//     /* ---- Cooldown check ---- */
//     const lastOtpRes = await pool.query(
//       `SELECT created_at
//        FROM email_otps
//        WHERE user_email = $1
//        ORDER BY created_at DESC
//        LIMIT 1`,
//       [email]
//     );

//     if (lastOtpRes.rows.length) {
//       const diff =
//         (Date.now() - new Date(lastOtpRes.rows[0].created_at)) / 1000;

//       if (diff < OTP_COOLDOWN_SECONDS) {
//         return res.status(429).json({
//           status: "COOLDOWN",
//           retry_after_seconds: Math.ceil(OTP_COOLDOWN_SECONDS - diff),
//         });
//       }
//     }

//     /* ---- Rate limit ---- */
//     const rateRes = await pool.query(
//       `SELECT COUNT(*)::int AS count
//        FROM email_otps
//        WHERE user_email = $1
//        AND created_at > NOW() - INTERVAL '${OTP_WINDOW_MINUTES} minutes'`,
//       [email]
//     );

//     if (rateRes.rows[0].count >= OTP_MAX_PER_WINDOW) {
//       return res.status(429).json({
//         status: "TOO_MANY_REQUESTS",
//         window_minutes: OTP_WINDOW_MINUTES,
//         max_requests: OTP_MAX_PER_WINDOW,
//       });
//     }

//     /* ---- Invalidate old OTPs ---- */
//     await pool.query(
//       `UPDATE email_otps
//        SET is_used = true
//        WHERE user_email = $1 AND is_used = false`,
//       [email]
//     );

//     /* ---- Create OTP ---- */
//     const otp = generateOtp6();
//     const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

//     await pool.query(
//       `INSERT INTO email_otps
//        (user_email, otp_hash, expires_at, is_used, created_at)
//        VALUES ($1, $2, NOW() + INTERVAL '${OTP_TTL_SECONDS} seconds', false, NOW())`,
//       [email, otpHash]
//     );

//     /* ---- Respond FAST ---- */
//     res.status(200).json({
//       status: "OTP_SENT",
//       expires_in_seconds: OTP_TTL_SECONDS,
//     });

//     /* ---- Send email ASYNC ---- */
//     sendOtpEmail(email, otp)
//       .then(() => console.log("OTP email sent to", email))
//       .catch(err => console.error("Email failed:", err.message));

//     /* ---- Dev only ---- */
//     if (process.env.NODE_ENV !== "production") {
//       console.log("OTP (DEV ONLY):", otp);
//     }

//   } catch (err) {
//     console.error("requestOtp error:", err);
//     res.status(500).json({ status: "SERVER_ERROR" });
//   }
// };

// /* =========================
//    VERIFY OTP
// ========================= */

// exports.verifyOtp = async (req, res) => {
//   const email = (req.body?.email || "").trim().toLowerCase();
//   const otp = (req.body?.otp || "").trim();

//   try {
//     if (!isValidEmail(email) || otp.length !== 6) {
//       return res.status(400).json({ status: "INVALID_INPUT" });
//     }

//     const otpRes = await pool.query(
//       `SELECT id, otp_hash, expires_at
//        FROM email_otps
//        WHERE user_email = $1 AND is_used = false
//        ORDER BY created_at DESC
//        LIMIT 1`,
//       [email]
//     );

//     if (!otpRes.rows.length) {
//       return res.status(410).json({ status: "NO_ACTIVE_OTP" });
//     }

//     const row = otpRes.rows[0];

//     if (new Date() > new Date(row.expires_at)) {
//       await pool.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [
//         row.id,
//       ]);
//       return res.status(410).json({ status: "OTP_EXPIRED" });
//     }

//     const valid = await bcrypt.compare(otp, row.otp_hash);
//     if (!valid) {
//       return res.status(400).json({ status: "INVALID_OTP" });
//     }

//     await pool.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [
//       row.id,
//     ]);

//     const userRes = await pool.query(
//       `SELECT id, email, role, approved_at, deleted_at
//        FROM users WHERE email = $1 LIMIT 1`,
//       [email]
//     );

//     if (!userRes.rows.length) {
//       return res.status(200).json({ status: "NEW_USER_REQUIRED" });
//     }

//     const user = userRes.rows[0];

//     if (user.deleted_at) {
//       return res.status(403).json({ status: "ACCOUNT_DELETED" });
//     }

//     if (user.role !== "admin" && !user.approved_at) {
//       return res.status(403).json({ status: "PENDING_APPROVAL" });
//     }

//     const token = signJwt(user);
//     res.status(200).json({ status: "OK", token, role: user.role });

//   } catch (err) {
//     console.error("verifyOtp error:", err);
//     res.status(500).json({ status: "SERVER_ERROR" });
//   }
// };