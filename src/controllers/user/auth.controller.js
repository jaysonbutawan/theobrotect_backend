const otpService = require("../../services/otp.service");
const userModel = require("../../models/user.model");

exports.requestOtp = async (req, res) => {
  try {
    const emailRaw = req.body?.email;

    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
      return res
        .status(400)
        .json({ status: "INVALID_EMAIL", message: "Email is required" });
    }

    const email = emailRaw.trim().toLowerCase();

    const deletedAt = await userModel.getDeletedAtByEmail(email);
    if (deletedAt) {
      return res
        .status(403)
        .json({ status: "ACCOUNT_DELETED", message: "Account is deleted." });
    }

    const result = await otpService.requestOtp(email);

    const statusMap = {
      INVALID_EMAIL: 400,
      ACCOUNT_DELETED: 403,
      COOLDOWN: 429,
      TOO_MANY_REQUESTS: 429,
      EMAIL_FAILED: 500,
      OTP_SENT: 200,
    };

    if (!result?.status) {
      console.error("otpService returned invalid result:", result);
      return res
        .status(500)
        .json({ status: "SERVER_ERROR", message: "Invalid service result" });
    }

    return res.status(statusMap[result.status] ?? 500).json(result);
  } catch (err) {
    console.error("requestOtp error:", err?.stack || err);
    return res
      .status(500)
      .json({
        status: "SERVER_ERROR",
        message: err?.message || "Internal error",
      });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const otpRaw = req.body?.otp;
    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
      return res
        .status(400)
        .json({ status: "INVALID_INPUT", message: "Email is required" });
    }
    if (typeof otpRaw !== "string" || !otpRaw.trim()) {
      return res
        .status(400)
        .json({ status: "INVALID_INPUT", message: "OTP is required" });
    }

    const email = emailRaw.trim().toLowerCase();
    const otp = otpRaw.trim();

    const deletedAt = await userModel.getDeletedAtByEmail(email);
    if (deletedAt) {
      return res
        .status(403)
        .json({ status: "ACCOUNT_DELETED", message: "Account is deleted." });
    }

    const result = await otpService.verifyOtp(email, otp);

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

    if (!result?.status) {
      console.error("otpService.verifyOtp returned invalid result:", result);
      return res
        .status(500)
        .json({ status: "SERVER_ERROR", message: "Invalid service result" });
    }

    return res.status(statusMap[result.status] ?? 500).json(result);
  } catch (err) {
    console.error("verifyOtp error:", err?.stack || err);
    return res.status(500).json({
      status: "SERVER_ERROR",
      message: err?.message || "Internal error",
    });
  }
};
