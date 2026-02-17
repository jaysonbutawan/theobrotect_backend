const ScanResults = require("../../models/scan_results.model");

function isISODate(s) {
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

exports.syncScan = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      user_id,
      local_id,
      disease_key,
      severity_key,
      confidence,
      scanned_at,
      next_scan_at,
    } = body;

    if (
      !user_id ||
      !local_id ||
      typeof local_id !== "string" ||
      !disease_key ||
      !severity_key ||
      typeof confidence !== "number"
    ) {
      return res.status(400).json({ status: "INVALID_INPUT" });
    }

    if (scanned_at && !isISODate(scanned_at)) {
      return res.status(400).json({ status: "INVALID_SCANNED_AT" });
    }

    if (next_scan_at && !isISODate(next_scan_at)) {
      return res.status(400).json({ status: "INVALID_NEXT_SCAN_AT" });
    }

    const scan = await ScanResults.upsertScanByUserAndLocalId(user_id, body);

    return res.status(200).json({ status: "OK", scan });
  } catch (err) {
    console.error("syncScan error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.listMyScans = async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ status: "USER_ID_REQUIRED" });

    const { rows, limit, offset } =
      await ScanResults.listScansByUser(user_id, {
        limit: req.query.limit,
        offset: req.query.offset,
      });

    return res.status(200).json({ status: "OK", scans: rows, limit, offset });
  } catch (err) {
    console.error("listMyScans error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.getMyScanById = async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ status: "USER_ID_REQUIRED" });

    const scan = await ScanResults.getScanByIdForUser(
      req.params.id,
      user_id
    );

    if (!scan) return res.status(404).json({ status: "NOT_FOUND" });

    return res.status(200).json({ status: "OK", scan });
  } catch (err) {
    console.error("getMyScanById error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};
