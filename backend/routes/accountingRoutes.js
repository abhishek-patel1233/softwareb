// Chart of accounts, manual vouchers, company settings, audit trail  (mounted at /api)
const express = require("express");
const router = express.Router();
const { canWrite, canAccess } = require("../middleware/auth");
const c = require("../controllers/accountController");

const ACCOUNTANTS = ["admin", "accountant"];

router.get("/accounts", c.getAccounts);
router.post("/accounts", canWrite(ACCOUNTANTS), c.createAccount);

router.get("/vouchers", c.getVouchers);
router.get("/vouchers/:id", c.getVoucher);
router.post("/vouchers", canWrite(ACCOUNTANTS), c.createVoucher);
router.post("/vouchers/:id/reverse", canWrite(ACCOUNTANTS), c.reverseManualVoucher);

router.get("/settings", c.getSettings);
router.put("/settings", canWrite(["admin"]), c.updateSettings);

router.get("/audit", canAccess(["admin", "accountant", "auditor"]), c.getAudit);

module.exports = router;
