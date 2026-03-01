const router = require("express").Router();
const { authRequired, requireRole } = require("../middleware/auth");
const authController = require("../controllers/user/user.controller");

router.post("/list_users", authRequired, requireRole("admin"),authController.listUsers);

module.exports = router;
