const bcrypt = require("bcrypt");
const { isValidEmail } = require("../utils/validators");
const { generateOtp6 } = require("../utils/otp");
const { sendOtpEmail } = require("../config/mailer");
const userModel = require("../models/user.model");
const otpModel = require("../models/email_otp.model");
const { signJwt } = require("../utils/jwt");

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 50);
const OTP_MAX_PER_WINDOW = Number(process.env.OTP_MAX_PER_WINDOW || 3);
const OTP_WINDOW_MINUTES = Number(process.env.OTP_WINDOW_MINUTES || 10);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

async function requestOtp(emailRaw) {
  const email = (emailRaw || "").trim().toLowerCase();

  if (!isValidEmail(email)) return { status: "INVALID_EMAIL" };

  const deletedAt = await userModel.getDeletedAtByEmail(email);
  if (deletedAt) return { status: "ACCOUNT_DELETED" };

  const lastCreatedAt = await otpModel.getLatestOtpCreatedAt(email);
  if (lastCreatedAt) {
    const diffSec = (Date.now() - new Date(lastCreatedAt).getTime()) / 1000;
    if (diffSec < OTP_COOLDOWN_SECONDS) {
      return {
        status: "COOLDOWN",
        retry_after_seconds: Math.ceil(OTP_COOLDOWN_SECONDS - diffSec),
      };
    }
  }

  const count = await otpModel.countOtpsInWindow(email, OTP_WINDOW_MINUTES);
  if (count >= OTP_MAX_PER_WINDOW) {
    return {
      status: "TOO_MANY_REQUESTS",
      window_minutes: OTP_WINDOW_MINUTES,
      max_requests: OTP_MAX_PER_WINDOW,
    };
  }

  await otpModel.invalidateActiveOtps(email);

  const otp = generateOtp6();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

  await otpModel.insertOtp({ email, otpHash, ttlSeconds: OTP_TTL_SECONDS });

 try {
  const info = await sendOtpEmail(email, otp, OTP_TTL_SECONDS);
  console.log("OTP email sent to", email, "messageId:", info.messageId);

  return { status: "OTP_SENT", expires_in_seconds: OTP_TTL_SECONDS };
} catch (err) {
  console.error("Email failed FULL:", err); 
  return {
    status: "EMAIL_FAILED",
    message: err.message,
  };
}
}

//aaaaaaaaaaaaaaaaaa
async function verifyOtp(emailRaw, otpRaw) {
  const email = (emailRaw || "").trim().toLowerCase();
  const otp = (otpRaw || "").trim();

  if (!isValidEmail(email) || otp.length !== 6) return { status: "INVALID_INPUT" };

  const activeOtp = await otpModel.getLatestActiveOtp(email);
  if (!activeOtp) return { status: "NO_ACTIVE_OTP" };

  if (new Date() > new Date(activeOtp.expires_at)) {
    await otpModel.markOtpUsed(activeOtp.id);
    return { status: "OTP_EXPIRED" };
  }

  const valid = await bcrypt.compare(otp, activeOtp.otp_hash);
  if (!valid) return { status: "INVALID_OTP" };

  await otpModel.markOtpUsed(activeOtp.id);

  const user = await userModel.findByEmail(email);
  if (!user) return { status: "NEW_USER_REQUIRED" };

  if (user.deleted_at) return { status: "ACCOUNT_DELETED" };

  if (user.role !== "admin" && !user.approved_at) {
    return { status: "PENDING_APPROVAL" };
  }

  const token = signJwt(user);
  return { status: "OK", token, role: user.role };
}

module.exports = { requestOtp, verifyOtp };
