const pool = require("../config/db");

const n2 = (v) => (v === undefined || v === null || v === "" ? null : v);

async function upsertScanByUserAndLocalId(userId, data) {
  const {
    local_id,
    image_url,
    scanned_at,
    disease_key,
    severity_key,
    confidence,
    location_lat,
    location_lng,
    location_accuracy,
    location_label,
    next_scan_at,
  } = data;

  const q = `
    INSERT INTO scan_results (
      user_id, local_id, image_url, scanned_at,
      disease_key, severity_key, confidence,
      location_lat, location_lng, location_accuracy, location_label,
      next_scan_at, created_at, updated_at
    )
    VALUES (
      $1, $2, $3,
      COALESCE($4::timestamptz, NOW()),
      $5, $6, $7,
      $8::double precision, $9::double precision, $10::double precision, $11,
      $12::timestamptz,
      NOW(), NOW()
    )
    ON CONFLICT (user_id, local_id)
    DO UPDATE SET
      -- Only replace with new values if they are not null (prevents "nulling out" on retries)
      image_url          = COALESCE(EXCLUDED.image_url, scan_results.image_url),

      -- Preserve existing scanned_at if the incoming scanned_at was null
      scanned_at         = COALESCE(EXCLUDED.scanned_at, scan_results.scanned_at),

      disease_key        = COALESCE(EXCLUDED.disease_key, scan_results.disease_key),
      severity_key       = COALESCE(EXCLUDED.severity_key, scan_results.severity_key),
      confidence         = COALESCE(EXCLUDED.confidence, scan_results.confidence),

      location_lat       = COALESCE(EXCLUDED.location_lat, scan_results.location_lat),
      location_lng       = COALESCE(EXCLUDED.location_lng, scan_results.location_lng),
      location_accuracy  = COALESCE(EXCLUDED.location_accuracy, scan_results.location_accuracy),
      location_label     = COALESCE(EXCLUDED.location_label, scan_results.location_label),

      next_scan_at       = COALESCE(EXCLUDED.next_scan_at, scan_results.next_scan_at),

      updated_at         = NOW()
    RETURNING
      id, user_id, local_id, image_url, scanned_at, next_scan_at, created_at, updated_at;
  `;

  const values = [
    userId,
    local_id,
    n2(image_url),
    n2(scanned_at),
    disease_key,
    severity_key,
    confidence,
    n2(location_lat),
    n2(location_lng),
    n2(location_accuracy),
    n2(location_label),
    n2(next_scan_at),
  ];

  const result = await pool.query(q, values);
  return result.rows[0];
}
async function listScansByUser(userId, { limit = 20, offset = 0 } = {}) {
  const safeLimit = Math.min(Number(limit || 20), 100);
  const safeOffset = Math.max(Number(offset || 0), 0);

  const q = `
    SELECT id, local_id, image_url, scanned_at, disease_key, severity_key, confidence,
           location_lat, location_lng, location_accuracy, location_label, next_scan_at,
           created_at, updated_at
    FROM scan_results
    WHERE user_id = $1
    ORDER BY scanned_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const { rows } = await pool.query(q, [userId, safeLimit, safeOffset]);
  return { rows, limit: safeLimit, offset: safeOffset };
}

async function getScanByIdForUser(scanId, userId) {
  const q = `
    SELECT *
    FROM scan_results
    WHERE id = $1 AND user_id = $2
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [scanId, userId]);
  return rows[0] || null;
}

exports.listScans = async (filters = {}) => {
  const {
    requester_user_id,
    user_id,
    disease_key,
    severity_key,
    from,
    to,
    limit,
    offset,
  } = filters;

  const l = Number.isFinite(Number(limit)) ? Math.min(Number(limit), 200) : 50;
  const o = Number.isFinite(Number(offset)) ? Math.max(Number(offset), 0) : 0;

  const where = [];
  const params = [];

  // choose one user constraint
  const effectiveUserId = requester_user_id || user_id;
  if (effectiveUserId) {
    params.push(effectiveUserId);
    where.push(`user_id = $${params.length}`);
  }

  if (disease_key) {
    params.push(disease_key);
    where.push(`disease_key = $${params.length}`);
  }

  if (severity_key) {
    params.push(severity_key);
    where.push(`severity_key = $${params.length}`);
  }

  //optional: validate dates before using
  if (from) {
    params.push(from);
    where.push(`scanned_at >= $${params.length}::timestamptz`);
  }

  if (to) {
    params.push(to);
    where.push(`scanned_at <= $${params.length}::timestamptz`);
  }

  params.push(l, o);

  const q = `
    SELECT *
    FROM scan_results
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY scanned_at DESC
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

  const { rows } = await pool.query(q, params);
  return { rows, limit: l, offset: o };
};
