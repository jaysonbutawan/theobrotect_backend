const jwt = require("jsonwebtoken");

function signJwt(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { signJwt };
