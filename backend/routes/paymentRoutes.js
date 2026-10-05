const express = require("express");
const router = express.Router();
const { getOutstanding, createPayment, getPayments, cancelPayment } = require("../controllers/paymentController");

router.get("/outstanding", getOutstanding); // before "/:id" routes
router.post("/", createPayment);
router.get("/", getPayments);
router.post("/:id/cancel", cancelPayment);

module.exports = router;
