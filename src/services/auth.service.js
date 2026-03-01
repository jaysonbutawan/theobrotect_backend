const bcrypt = require("bcrypt");
const usersModel = require("../models/users.model");
const { isValidEmail } = require("../utils/validators");

async function requestOtp({ email, otpService }) {
  const emailRaw = (email || "").trim().toLowerCase();
  if (!isValidEmail(emailRaw)) {
    return { status: "INVALID_EMAIL", message: "Email is required" };
  }

  const deletedAt = await usersModel.getDeletedAtByEmail(emailRaw);
  if (deletedAt) {
    return { status: "ACCOUNT_DELETED", message: "Account is deleted." };
  }

  // otpService returns { status: ... }
  return otpService.requestOtp(emailRaw);
}

async function verifyOtp({ email, otp, otpService }) {
  const emailNorm = (email || "").trim().toLowerCase();
  const otpNorm = (otp || "").trim();

  if (!isValidEmail(emailNorm) || !otpNorm) {
    return { status: "INVALID_INPUT", message: "Email and OTP are required" };
  }

  const deletedAt = await usersModel.getDeletedAtByEmail(emailNorm);
  if (deletedAt) {
    return { status: "ACCOUNT_DELETED", message: "Account is deleted." };
  }

  return otpService.verifyOtp(emailNorm, otpNorm);
}

async function registerUser({ email, fullName, address, contactNumber }) {
  const emailNorm = (email || "").trim().toLowerCase();
  const name = (fullName || "").trim();
  const addr = (address || "").trim();
  const contact = (contactNumber || "").trim();

  if (!isValidEmail(emailNorm) || !name || !addr || !contact) {
    return { status: "INVALID_INPUT" };
  }

  const client = await usersModel.pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await usersModel.findByEmail(emailNorm);
    if (existing) {
      await client.query("ROLLBACK");
      return { status: "ALREADY_REGISTERED" };
    }

    const userId = await usersModel.insertUser(client, { email: emailNorm, role: "user" });
    await usersModel.insertUserProfile(client, {
      userId,
      fullName: name,
      address: addr,
      contactNumber: contact,
    });

    await client.query("COMMIT");
    return { status: "PENDING_APPROVAL", userId };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    // optional: handle race condition
    if (err?.code === "23505") return { status: "ALREADY_REGISTERED" };
    throw err;
  } finally {
    client.release();
  }
}

async function adminLogin({ email, password }) {
  const emailNorm = (email || "").trim().toLowerCase();
  const pass = (password || "").trim();

  if (!isValidEmail(emailNorm) || pass.length < 8) {
    return { status: "INVALID_INPUT" };
  }

  const user = await usersModel.findForAdminLogin(emailNorm);

  if (!user) return { status: "INVALID_CREDENTIALS" };
  if (user.deleted_at) return { status: "ACCOUNT_DELETED" };
  if (user.role !== "admin") return { status: "NOT_ADMIN" };
  if (!user.password_hash) return { status: "ADMIN_PASSWORD_NOT_SET" };

  const ok = await bcrypt.compare(pass, user.password_hash);
  if (!ok) return { status: "INVALID_CREDENTIALS" };

  return {
    status: "OK",
    user: { id: user.id, email: user.email, role: user.role },
  };
}

module.exports = {
  requestOtp,
  verifyOtp,
  registerUser,
  adminLogin,
};