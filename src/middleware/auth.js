const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ status: "MISSING_TOKEN" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; 
    return next();
  } catch (err) {
    return res.status(401).json({ status: "INVALID_OR_EXPIRED_TOKEN" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: "FORBIDDEN" });
    }
    next();
  };
}

module.exports = { authRequired, requireRole };
