const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const resultController = require("../controllers/scan_result.controller");

router.use(authRequired);

router.post("/sync", resultController.syncScan);
router.get("/", resultController.listMyScans);
router.get("/:id", resultController.getMyScanById);

module.exports = router;
