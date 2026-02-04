const router = require("express").Router();
const otpController = require("../controllers/otp_controller");

router.post("/request-otp", otpController.requestOtp);
router.post("/verify-otp", otpController.verifyOtp);

module.exports = router;