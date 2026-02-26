const otpService = require("../../services/otp.service");

exports.requestOtp = async (req, res) => {
  try {
     const email = req.body?.email;
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ status: "INVALID_EMAIL", message: "Email is required" });
    }

    const result = await otpService.requestOtp(email.trim().toLowerCase());

    const statusMap = {
      INVALID_EMAIL: 400,
      ACCOUNT_DELETED: 403,
      COOLDOWN: 429,
      TOO_MANY_REQUESTS: 429,
      EMAIL_FAILED: 500,
      OTP_SENT: 200,
    };

    return res.status(statusMap[result.status] || 500).json(result);
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({ status: "SERVER_ERROR", message: err?.message || "Internal error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const result = await otpService.verifyOtp(req.body?.email, req.body?.otp);

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

    return res.status(statusMap[result.status] || 500).json(result);
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};
