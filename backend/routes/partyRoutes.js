const express = require("express");
const router = express.Router();
const { createParty, getParties } = require("../controllers/partyController");

router.post("/", createParty);
router.get("/", getParties);

// Yeh Line Hona Bahut Zaruri Hai:
module.exports = router;