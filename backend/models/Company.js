const mongoose = require("mongoose");

// Single-company settings (one document)
const companySchema = new mongoose.Schema(
  {
    name: { type: String, default: "Astcomm Infotel" },
    gstin: { type: String, uppercase: true, default: "" },
    address: { type: String, default: "" },
    state: { type: String, default: "Madhya Pradesh" },
    stateCode: { type: String, default: "23" },
    phone: String,
    email: String,
    bankName: String,
    bankAccount: String,
    ifsc: String,
    upi: String,
    creditDays: { type: Number, default: 30 },
    lockedUpto: { type: Date, default: null }, // financial period lock: no posting on/before this date
    allowNegativeStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
