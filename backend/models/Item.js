const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hsnCode: { type: String, required: true },
    unit: { type: String, default: "Pcs" },
    itemType: { type: String, enum: ["Goods", "Service"], default: "Goods" }, // services (HSN/SAC starting 99) are never stocked
    sellingPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    openingStock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);