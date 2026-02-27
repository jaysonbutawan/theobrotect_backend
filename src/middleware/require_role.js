module.exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ status: "UNAUTHORIZED" });

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ status: "FORBIDDEN" });
    }
    next();
  };
};