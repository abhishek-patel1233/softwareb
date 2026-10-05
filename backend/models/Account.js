const mongoose = require("mongoose");

// Chart of accounts. Party ledgers (debtors/creditors) are auto-created per Party.
// opening is signed: Dr = +, Cr = -
const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: ["Asset", "Liability", "Income", "Expense", "Equity"], required: true },
    subGroup: { type: String, default: "" },
    key: { type: String, unique: true, sparse: true }, // system accounts only (CASH, BANK, SALES ...)
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", unique: true, sparse: true },
    opening: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);
