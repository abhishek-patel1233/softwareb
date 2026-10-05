
const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController");
const { optionalAuth } = require("../middleware/auth");

router.post("/register", optionalAuth, registerUser);
router.post("/login", loginUser); // Check: Kya ye line present hai?

module.exports = router;