const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const SecurityEvent = require("../models/SecurityEvent");

const router = express.Router();

// ✅ Rate limiter only for login route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again later." },
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWTSECRET;
  if (!secret)
    throw new Error("Missing JWT secret in .env (JWT_SECRET or JWTSECRET)");
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, username: user.username },
    getJwtSecret(),
    { expiresIn: "1d" },
  );
}

// ───────────────────────────────────────────
// REGISTER
// ───────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Validate fields
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email, and password are required" });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 3. Validate password length
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // 4. Check for existing user
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const conflict = existing.email === email ? "Email" : "Username";
      return res.status(409).json({ message: `${conflict} already exists` });
    }

    // 5. Assign role
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "member";

    // 6. Create user (password is hashed by User model pre-save hook)
    const user = await User.create({
      username,
      email,
      password,
      role,
      isActive: true,
    });

    // 7. Log security event (non-blocking — won't crash register if this fails)
    try {
      await SecurityEvent.create({
        user: user._id,
        eventType: "REGISTER",
        severity: "low",
        ip: req.ip,
        details: { email },
      });
    } catch (eventErr) {
      console.warn(
        "⚠️ SecurityEvent logging failed (non-fatal):",
        eventErr.message,
      );
    }

    // 8. Sign token and respond
    const token = signToken(user);
    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      message: "Register failed",
      error: err.message,
      stack: err.stack,
    });
  }
});

// ───────────────────────────────────────────
// LOGIN (rate-limited)
// ───────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      try {
        await SecurityEvent.create({
          eventType: "LOGIN_FAILED",
          severity: "medium",
          ip: req.ip,
          details: { email, reason: "USER_NOT_FOUND_OR_INACTIVE" },
        });
      } catch (eventErr) {
        console.warn(
          "⚠️ SecurityEvent logging failed (non-fatal):",
          eventErr.message,
        );
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      try {
        await SecurityEvent.create({
          user: user._id,
          eventType: "LOGIN_FAILED",
          severity: "medium",
          ip: req.ip,
          details: { reason: "WRONG_PASSWORD" },
        });
      } catch (eventErr) {
        console.warn(
          "⚠️ SecurityEvent logging failed (non-fatal):",
          eventErr.message,
        );
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    try {
      await SecurityEvent.create({
        user: user._id,
        eventType: "LOGIN_SUCCESS",
        severity: "low",
        ip: req.ip,
        details: {},
      });
    } catch (eventErr) {
      console.warn(
        "⚠️ SecurityEvent logging failed (non-fatal):",
        eventErr.message,
      );
    }

    const token = signToken(user);
    return res.json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err); // Full error in server terminal
    return res.status(500).json({
      message: "Login failed",
      error: err.message,
    });
  }
});

module.exports = router;
