exports.adminLogin = async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = (req.body?.password || "").trim();

  try {
    if (!isValidEmail(email) || password.length < 8) {
      return res.status(400).json({ status: "INVALID_INPUT" });
    }

    const userRes = await pool.query(
      `SELECT id, email, role, password_hash, deleted_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ status: "INVALID_CREDENTIALS" });
    }

    const user = userRes.rows[0];

    if (user.deleted_at) {
      return res.status(403).json({ status: "ACCOUNT_DELETED" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ status: "NOT_ADMIN" });
    }

    if (!user.password_hash) {
      return res.status(409).json({ status: "ADMIN_PASSWORD_NOT_SET" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ status: "INVALID_CREDENTIALS" });
    }

    const token = signJwt(user);
    return res.status(200).json({ status: "OK", token, role: user.role });

  } catch (err) {
    console.error("adminLogin error:", err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
  
};
exports.dashboard = async (req, res) => {
  return res.status(200).json({
    status: "OK",
    message: "Admin dashboard",
    user: req.user,
  });
};

exports.profile = async (req, res) => {
  return res.status(200).json({
    status: "OK",
    user: req.user,
  });
};

