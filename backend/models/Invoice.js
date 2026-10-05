const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    docType: { type: String, enum: ["Tax Invoice", "Bill of Supply"], default: "Tax Invoice" },
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    placeOfSupply: String,
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        name: { type: String, required: true },
        hsnCode: String,
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        gstRate: { type: Number, required: true },
        amount: { type: Number, required: true }, // taxable value of the line
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
    stateType: { type: String, enum: ["INTRA", "INTER"], required: true }, // INTRA = CGST+SGST, INTER = IGST
    status: { type: String, enum: ["Pending", "Partial", "Paid", "Cancelled"], default: "Pending" },
    paidAmount: { type: Number, default: 0 },
    adjustedAmount: { type: Number, default: 0 }, // via credit/debit notes (credit +, debit -)
    notes: String,
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    cancelled: { type: Boolean, default: false },
    cancelReason: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

invoiceSchema.virtual("outstanding").get(function () {
  return this.cancelled ? 0 : Math.round((this.grandTotal - this.paidAmount - this.adjustedAmount) * 100) / 100;
});

module.exports = mongoose.model("Invoice", invoiceSchema);
