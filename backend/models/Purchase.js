const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true }, // internal: PUR-2026-0001
    billNumber: { type: String, required: true, trim: true }, // supplier's invoice number
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
    billDate: { type: Date, required: true },
    dueDate: { type: Date },
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        name: { type: String, required: true },
        hsnCode: String,
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        gstRate: { type: Number, required: true },
        amount: { type: Number, required: true },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
      },
    ],
    subTotal: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    stateType: { type: String, enum: ["INTRA", "INTER"], required: true },
    status: { type: String, enum: ["Pending", "Partial", "Paid", "Cancelled"], default: "Pending" },
    paidAmount: { type: Number, default: 0 },
    adjustedAmount: { type: Number, default: 0 }, // via debit/credit notes
    notes: String,
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    cancelled: { type: Boolean, default: false },
    cancelReason: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

purchaseSchema.virtual("outstanding").get(function () {
  return this.cancelled ? 0 : Math.round((this.grandTotal - this.paidAmount - this.adjustedAmount) * 100) / 100;
});

module.exports = mongoose.model("Purchase", purchaseSchema);
