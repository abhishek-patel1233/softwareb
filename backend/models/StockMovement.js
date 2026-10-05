const mongoose = require("mongoose");

// direction IN with rate  -> valued at that rate (purchases)
// direction IN, rate null -> valued at current average cost (sales returns)
// direction OUT           -> always valued at current weighted-average cost
const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    date: { type: Date, required: true },
    direction: { type: String, enum: ["IN", "OUT"], required: true },
    kind: String, // Sale, Purchase, SalesReturn, PurchaseReturn, Reversal
    qty: { type: Number, required: true },
    rate: { type: Number, default: null },
    refModel: String,
    refId: mongoose.Schema.Types.ObjectId,
    refNo: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
