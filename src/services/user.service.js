// src/services/users.service.js
const usersModel = require("../models/user.model");

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
function encodeCursor(row) {
  const payload = { created_at: row.created_at, id: row.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const obj = JSON.parse(raw);
    if (!obj?.created_at || !obj?.id) return null;
    return obj;
  } catch {
    return null;
  }
}

async function listUsersCursor({ limit, cursor, includeDeleted, q } = {}) {
  const l = clampInt(limit, 1, 200, 50);
  const cursorObj = decodeCursor(cursor);

  const rows = await usersModel.listUsersKeyset({
    limit: l,
    cursorObj,
    includeDeleted: includeDeleted === true,
    q: typeof q === "string" ? q : null,
  });

  const next_cursor =
    rows.length === l ? encodeCursor(rows[rows.length - 1]) : null;

  return {
    status: "OK",
    items: rows,
    next_cursor,
    limit: l,
  };
}

module.exports = {
  listUsersCursor,
};
