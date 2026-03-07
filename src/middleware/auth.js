const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      status: "MISSING_TOKEN",
      message: "Authentication token is required."
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "INVALID_OR_EXPIRED_TOKEN",
      message: "Token is invalid or expired."
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        status: "FORBIDDEN",
        message: "Admin access required."
      });
    }

    next();
  };
}

module.exports = { authRequired, requireRole };