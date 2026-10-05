const mongoose = require("mongoose");

// Fields match the existing Expense.jsx form
const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, required: true },
    paymentMode: { type: String, default: "Cash" },
    vendorName: String,
    status: { type: String, enum: ["Paid", "Pending", "Cancelled"], default: "Paid" },
    note: String,
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
