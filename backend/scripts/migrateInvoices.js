// One-time: gives invoices created BEFORE the accounting engine a ledger voucher + stock movement.
// Run once from /backend:  node scripts/migrateInvoices.js
require("dotenv").config();
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const { sys, getPartyAccount, taxLines, postVoucher } = require("../services/accounting");
const { recordStock } = require("../services/stock");
const { round2, toDate } = require("../services/utils");

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/accounting");
  const list = await Invoice.find({ voucher: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`${list.length} invoice(s) to migrate`);

  for (const inv of list) {
    const date = toDate(inv.createdAt); // old invoices have no invoiceDate; createdAt held the chosen date
    const tax = { cgst: inv.cgst || 0, sgst: inv.sgst || 0, igst: inv.igst || 0 };
    try {
      const v = await postVoucher({
        type: "Sales", voucherNo: inv.invoiceNumber, date, party: inv.party, refModel: "Invoice", refId: inv._id,
        narration: `Sales invoice ${inv.invoiceNumber} (migrated)`,
        lines: [
          { account: await getPartyAccount(inv.party), debit: inv.grandTotal },
          { account: await sys("SALES"), credit: inv.subTotal },
          ...(await taxLines("OUT", tax, "credit")),
        ],
      });
      await Invoice.updateOne(
        { _id: inv._id },
        { $set: { voucher: v._id, invoiceDate: date, gstAmount: round2(tax.cgst + tax.sgst + tax.igst), dueDate: new Date(date.getTime() + 30 * 86400000), status: "Pending", cancelled: false, paidAmount: 0, adjustedAmount: 0, docType: "Tax Invoice" } }
      );
      await recordStock(inv.items.map((i) => ({ item: i.item, quantity: i.quantity })), { date, direction: "OUT", kind: "Sale", refModel: "Invoice", refId: inv._id, refNo: inv.invoiceNumber });
      console.log("migrated", inv.invoiceNumber);
    } catch (e) {
      console.error("FAILED", inv.invoiceNumber, "-", e.message);
    }
  }
  await mongoose.disconnect();
})();
