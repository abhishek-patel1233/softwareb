const express = require("express");
const router = express.Router();
const { createPurchase, getPurchases, getPurchase, cancelPurchase } = require("../controllers/purchaseController");

router.post("/", createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchase);
router.post("/:id/cancel", cancelPurchase);

module.exports = router;
