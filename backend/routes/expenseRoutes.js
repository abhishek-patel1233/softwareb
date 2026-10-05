const express = require("express");
const router = express.Router();
const { createExpense, getExpenses, payExpense, cancelExpense } = require("../controllers/expenseController");

router.post("/", createExpense);
router.get("/", getExpenses);
router.post("/:id/pay", payExpense);
router.post("/:id/cancel", cancelExpense);

module.exports = router;
