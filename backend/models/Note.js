const mongoose = require("mongoose");

// Credit / Debit note against a sales invoice or a purchase bill
//  Invoice  + Credit : sales return / discount  (reduces receivable)
//  Invoice  + Debit  : extra charge             (increases receivable)
//  Purchase + Debit  : purchase return          (reduces payable)
//  Purchase + Credit : supplier extra charge    (increases payable)
const noteSchema = new mongoose.Schema(
  {
    noteNumber: { type: String, required: true, unique: true }, // CN-2026-0001 / DN-2026-0001
    kind: { type: String, enum: ["Credit", "Debit"], required: true },
    againstModel: { type: String, enum: ["Invoice", "Purchase"], required: true },
    against: { type: mongoose.Schema.Types.ObjectId, required: true },
    againstNo: String,
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
    date: { type: Date, required: true },
    reason: { type: String, default: "Other" },
    returnStock: { type: Boolean, default: false },
    items: [
      {
        _id: false,
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        name: String,
        hsnCode: String,
        quantity: Number,
        price: Number,
        discount: { type: Number, default: 0 },
        gstRate: Number,
        amount: Number,
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
      },
    ],
    subTotal: Number,
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    stateType: { type: String, enum: ["INTRA", "INTER"] },
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    cancelled: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
