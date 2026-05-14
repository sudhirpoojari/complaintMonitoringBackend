// routes/gpRoutes.js
const express = require("express");
const router = express.Router();
const GP = require("../model/gp");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* 
// Registration endpoint disabled to prevent misuse and duplication
router.post("/register", async (req, res) => {
  try {
    const { gp_email, gp_password } = req.body;

    if (!gp_email || !gp_password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await GP.findOne({ gp_email });
    if (existing) {
      return res.status(409).json({ error: "GP email already registered" });
    }

    const hashedPassword = await bcrypt.hash(gp_password, 10);
    const newGp = new GP({ gp_email, gp_password: hashedPassword });
    await newGp.save();

    return res.json({ message: "GP registered successfully", gp_email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

router.post("/login", async (req, res) => {
  try {
    const gp_email = req.body.gp_email || req.body.email;
    const gp_password = req.body.gp_password || req.body.password;

    if (!gp_email || !gp_password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const gp = await GP.findOne({ gp_email });
    if (!gp) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    let passwordMatches = false;
    const storedPassword = gp.gp_password || "";

    if (
      typeof storedPassword === "string" &&
      (storedPassword.startsWith("$2a$") ||
       storedPassword.startsWith("$2b$") ||
       storedPassword.startsWith("$2y$"))
    ) {
      passwordMatches = await bcrypt.compare(gp_password, storedPassword);
    } else {
      passwordMatches = gp_password === storedPassword;
    }

    if (!passwordMatches) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const gpResponse = gp.toObject();
    delete gpResponse.gp_password;

    const token = jwt.sign(
      { id: gp._id },
      process.env.JWT_SECRET || "secretkey123",
      { expiresIn: "4h" }
    );

    res.json({ message: "Login successful", token, gp: gpResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
