// routes/dev.routes.js
const router = require("express").Router();
const jwt = require("jsonwebtoken");

router.get("/dev-token/:userId", (req, res) => {
  const { userId } = req.params;

  const token = jwt.sign(
    { id: userId }, // IMPORTANT: must match what scan controller expects
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    status: "OK",
    token,
    userId,
  });
});

module.exports = router;