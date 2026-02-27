const express = require("express");
const router = express.Router();

const { authRequired, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/admin/admin.controller");

router.use(authRequired);
router.use(requireRole("admin"));

router.get("/dashboard", adminController.dashboard);
router.get("/profile", adminController.profile);

module.exports = router;
