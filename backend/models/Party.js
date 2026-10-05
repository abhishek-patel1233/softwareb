const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Customer", "Supplier"], required: true },
    gstin: { type: String, uppercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Party", partySchema);