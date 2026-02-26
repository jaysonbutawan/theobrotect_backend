const pool = require("../../config/db");
const userModel = require("../models/user.model");

exports.register = async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const fullName = (req.body?.full_name || "").trim();
  const address = (req.body?.address || "").trim();
  const contact = (req.body?.contact_number || "").trim();

  if (!userModel.isValidEmail(email) || !fullName || !address || !contact) {
    return res.status(400).json({ status: "INVALID_INPUT" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await userModel.findByEmail(client, email);
    if (existing) {
      await client.query("ROLLBACK");
      return res.status(409).json({ status: "ALREADY_REGISTERED" });
    }

    const userId = await userModel.insertUser(client, email);
    await userModel.insertUserProfile(client, userId, fullName, address, contact);

    await client.query("COMMIT");
    return res.status(201).json({ status: "PENDING_APPROVAL", userId });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    console.error("register error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  } finally {
    client.release();
  }
};