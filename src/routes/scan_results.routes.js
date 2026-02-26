const router = require("express").Router();
const resultController = require("../controllers/user/scan_result.controller");
const { authRequired } = require("../middleware/auth");

router.post("/sync", authRequired, resultController.syncScan);
router.get("/", authRequired, resultController.listScans);
router.get("/:id", authRequired, resultController.getMyScanById);

module.exports = router;
