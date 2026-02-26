const ScanResults = require("../../models/scan_results.model");

function isISODate(s) {
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

exports.syncScan = async (req, res) => {
  try {
    const body = req.body || {};
    //remove this when login work
    const isUuid = (s) =>
      typeof s === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        s,
      );

    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ status: "UNAUTHORIZED" });

    //remove this when login work
    if (!isUuid(userId)) {
      return res.status(400).json({
        status: "INVALID_USER_ID",
        message: "user_id must be a UUID",
        received: userId,
      });
    }

    const {
      local_id,
      disease_key,
      image_url,
      severity_key,
      confidence,
      location_lat,
      location_lng,
      location_accuracy,
      location_label,
      scanned_at,
      next_scan_at,
    } = body;

    if (
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

    const scan = await ScanResults.upsertScanByUserAndLocalId(userId, body);

    return res.status(200).json({ status: "OK", scan });
  } catch (err) {
    console.error("syncScan error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.listMyScans = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ status: "UNAUTHORIZED" });

    const { disease_key, severity_key, from, to, limit, offset } = req.query;

    const { rows, limit: l, offset: o } = await ScanResults.listScans({
      requester_user_id: userId,
      disease_key,
      severity_key,
      from,
      to,
      limit,
      offset,
    });

    return res.status(200).json({ status: "OK", scans: rows, limit: l, offset: o });
  } catch (err) {
    console.error("listMyScans error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.listScans = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ status: "UNAUTHORIZED" });

    const { disease_key, severity_key, from, to, limit, offset, user_id } =
      req.query;

    const filters = {
      disease_key,
      severity_key,
      from,
      to,
      limit,
      offset,
      user_id: role === "admin" ? user_id : undefined,
      requester_user_id: role === "admin" ? undefined : userId,
    };

    const { rows, limit: l, offset: o } = await ScanResults.listScans(filters);

    return res
      .status(200)
      .json({ status: "OK", scans: rows, limit: l, offset: o });
  } catch (err) {
    console.error("listScans error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};

exports.getMyScanById = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ status: "UNAUTHORIZED" });

    const scan = await ScanResults.getScanByIdForUser(req.params.id, userId);

    if (!scan) return res.status(404).json({ status: "NOT_FOUND" });

    return res.status(200).json({ status: "OK", scan });
  } catch (err) {
    console.error("getMyScanById error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};
