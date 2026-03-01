const usersService = require("../services/users.service");

exports.listUsers = async (req, res) => {
  try {
    const requester = req.user; 

    if (!requester) {
      return res.status(401).json({ status: "UNAUTHORIZED" });
    }

    if (requester.role !== "admin") {
      return res.status(403).json({ status: "FORBIDDEN" });
    }

    const result = await usersService.listUsersCursor({
      limit: req.query.limit,
      cursor: req.query.cursor,
      q: req.query.q,
      includeDeleted: req.query.includeDeleted === "1",
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("listUsers error:", err?.stack || err);
    return res.status(500).json({ status: "SERVER_ERROR" });
  }
};