const mongoose = require("mongoose");

// Double-entry voucher. Sum(debit) must equal Sum(credit) - enforced in services/accounting.js
const voucherSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ["Sales", "Purchase", "Receipt", "Payment", "Contra", "Journal", "CreditNote", "DebitNote", "Expense"],
    },
    date: { type: Date, required: true, index: true },
    narration: { type: String, default: "" },
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
    lines: [
      {
        _id: false,
        account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ["Posted", "Reversed"], default: "Posted" },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    refModel: String,
    refId: mongoose.Schema.Types.ObjectId,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    createdByName: String,
  },
  { timestamps: true }
);

voucherSchema.index({ "lines.account": 1, date: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
