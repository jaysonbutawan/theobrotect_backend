const router = require("express").Router();
const otpController = require("../controllers/user/auth.controller");

router.post("/request-otp", otpController.requestOtp);
router.post("/verify-otp", otpController.verifyOtp);
router.post("/register", otpController.register);

module.exports = router;