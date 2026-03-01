const otpService = require("../../services/otp.service");
const authService = require("../../services/auth.service");
const { signJwt } = require("../../utils/jwt"); 

exports.requestOtp = async (req, res) => {
  try {
    const result = await authService.requestOtp({
      email: req.body?.email,
      otpService,
    });

    const statusMap = {
      INVALID_EMAIL: 400,
      ACCOUNT_DELETED: 403,
      COOLDOWN: 429,
      TOO_MANY_REQUESTS: 429,
      EMAIL_FAILED: 500,
      OTP_SENT: 200,
    };

    return res.status(statusMap[result.status] ?? 500).json(result);
  } catch (err) {
    console.error("requestOtp error:", err?.stack || err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp({
      email: req.body?.email,
      otp: req.body?.otp,
      otpService,
    });

    const statusMap = {
      INVALID_INPUT: 400,
      INVALID_OTP: 400,
      NO_ACTIVE_OTP: 410,
      OTP_EXPIRED: 410,
      ACCOUNT_DELETED: 403,
      PENDING_APPROVAL: 403,
      NEW_USER_REQUIRED: 200,
      OK: 200,
    };

    return res.status(statusMap[result.status] ?? 500).json(result);
  } catch (err) {
    console.error("verifyOtp error:", err?.stack || err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.register = async (req, res) => {
  try {
    const result = await authService.registerUser({
      email: req.body?.email,
      fullName: req.body?.full_name,
      address: req.body?.address,
      contactNumber: req.body?.contact_number,
    });

    const statusMap = {
      INVALID_INPUT: 400,
      ALREADY_REGISTERED: 409,
      PENDING_APPROVAL: 201,
    };

    return res.status(statusMap[result.status] ?? 500).json(result);
  } catch (err) {
    console.error("register error:", err?.stack || err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const result = await authService.adminLogin({
      email: req.body?.email,
      password: req.body?.password,
    });

    const statusMap = {
      INVALID_INPUT: 400,
      INVALID_CREDENTIALS: 401,
      ACCOUNT_DELETED: 403,
      NOT_ADMIN: 403,
      ADMIN_PASSWORD_NOT_SET: 409,
      OK: 200,
    };

    if (result.status !== "OK") {
      return res.status(statusMap[result.status] ?? 400).json({ status: result.status });
    }

    const token = signJwt(result.user);
    return res.status(200).json({ status: "OK", token, role: result.user.role });
  } catch (err) {
    console.error("adminLogin error:", err?.stack || err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};