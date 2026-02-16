// src/models/scan_results.model.js
const pool = require("../config/db");

// allow null/undefined/"" -> null
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
      $1, $2, $3, COALESCE($4::timestamptz, NOW()),
      $5, $6, $7,
      $8, $9, $10, $11,
      $12, NOW(), NOW()
    )
    ON CONFLICT (user_id, local_id)
    DO UPDATE SET
      image_url = COALESCE(EXCLUDED.image_url, scan_results.image_url),
      scanned_at = EXCLUDED.scanned_at,
      disease_key = EXCLUDED.disease_key,
      severity_key = EXCLUDED.severity_key,
      confidence = EXCLUDED.confidence,
      location_lat = EXCLUDED.location_lat,
      location_lng = EXCLUDED.location_lng,
      location_accuracy = EXCLUDED.location_accuracy,
      location_label = EXCLUDED.location_label,
      next_scan_at = EXCLUDED.next_scan_at,
      updated_at = NOW()
    RETURNING id, user_id, local_id, image_url, scanned_at, next_scan_at, updated_at;
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

module.exports = {
  upsertScanByUserAndLocalId,
  listScansByUser,
  getScanByIdForUser,
};
