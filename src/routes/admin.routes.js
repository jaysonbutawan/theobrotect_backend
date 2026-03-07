const express = require("express");
const router = express.Router();

const { authRequired, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/admin/admin.controller");


router.get("/dashboard",authRequired,requireRole("admin"), adminController.dashboard);
router.get("/profile",authRequired,requireRole("admin"), adminController.profile);
router.post("/login", adminController.adminLogin);

module.exports = router;
