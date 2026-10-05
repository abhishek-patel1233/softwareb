const express = require("express");
const router = express.Router();
const r = require("../controllers/reportController");

router.get("/dashboard", r.dashboard);
router.get("/periods", r.periods);
router.get("/day-book", r.dayBook);
router.get("/ledger", r.ledger);
router.get("/trial-balance", r.trialBalance);
router.get("/profit-loss", r.profitLoss);
router.get("/balance-sheet", r.balanceSheet);
router.get("/ageing", r.ageing);
router.get("/gst", r.gstSummary);
router.get("/stock", r.stockReport);
router.get("/stock-ledger", r.stockLedger);
router.get("/cash-flow", r.cashFlow);

module.exports = router;
