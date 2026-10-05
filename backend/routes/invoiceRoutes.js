const express = require("express");
const router = express.Router();
const { createInvoice, getInvoices, getInvoice, cancelInvoice } = require("../controllers/invoiceController");

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoice);
router.post("/:id/cancel", cancelInvoice);

module.exports = router;
