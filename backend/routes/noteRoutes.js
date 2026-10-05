const express = require("express");
const router = express.Router();
const { createNote, getNotes, cancelNote } = require("../controllers/noteController");

router.post("/", createNote);
router.get("/", getNotes);
router.post("/:id/cancel", cancelNote);

module.exports = router;
