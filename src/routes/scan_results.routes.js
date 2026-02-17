const router = require("express").Router();
const resultController = require("../controllers/user/scan_result.controller");

router.post("/sync", resultController.syncScan);
router.get("/", resultController.listMyScans);
router.get("/:id", resultController.getMyScanById);

module.exports = router;
