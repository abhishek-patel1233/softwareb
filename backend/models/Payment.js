const mongoose = require("mongoose");

// Receipt voucher (money in from customer) / Payment voucher (money out to supplier)
const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, unique: true }, // REC-2026-0001 / PAY-2026-0001
    kind: { type: String, enum: ["Receipt", "Payment"], required: true },
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, default: "Bank" }, // Cash / Bank / UPI / Cheque / NEFT / RTGS
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" }, // cash/bank ledger used
    reference: String,
    narration: String,
    allocations: [
      {
        _id: false,
        doc: { type: mongoose.Schema.Types.ObjectId, required: true },
        docModel: { type: String, enum: ["Invoice", "Purchase"], required: true },
        docNo: String,
        amount: { type: Number, required: true },
      },
    ],
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    cancelled: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
