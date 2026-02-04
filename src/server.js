require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use("/auth", require("./routes/auth_routes"));
app.use("/users", require("./routes/user_routes"));

app.listen(process.env.PORT || 5000, () => console.log("Server running"));

