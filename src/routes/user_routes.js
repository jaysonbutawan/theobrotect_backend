const router = require("express").Router();
const userController = require("../controllers/user/user_controller");
const resultController = require("../controllers/scan_result.controller");

router.post("/register", userController.register);

router.post("/sync", resultController.syncScan);
router.get("/", resultController.listMyScans);
router.get("/:id", resultController.getMyScanById);

module.exports = router;
