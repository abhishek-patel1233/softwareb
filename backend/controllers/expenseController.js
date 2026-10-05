const Expense = require("../models/Expense");
const Voucher = require("../models/Voucher");
const { sys, getExpenseAccount, getCashBankAccount, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { round2, httpError, toDate } = require("../services/utils");

// Paid expense: Dr Expense / Cr Cash-Bank.   Pending expense: Dr Expense / Cr Outstanding Expenses
const createExpense = async (req, res) => {
  const b = req.body || {};
  const amount = round2(b.amount);
  if (!b.title || !b.category) throw httpError(400, "Title and category are required");
  if (!(amount > 0)) throw httpError(400, "Amount must be greater than 0");

  const date = toDate(b.expenseDate);
  await assertOpenPeriod(date);
  const status = b.status === "Pending" ? "Pending" : "Paid";
  const expenseNumber = await nextNumber("EXP", date);

  const expense = await Expense.create({
    expenseNumber, title: b.title, category: b.category, amount, expenseDate: date,
    paymentMode: b.paymentMode, vendorName: b.vendorName, status, note: b.note, createdBy: req.user?._id,
  });

  try {
    const voucher = await postVoucher({
      type: "Expense", voucherNo: expenseNumber, date, refModel: "Expense", refId: expense._id, user: req.user,
      narration: `${b.title}${b.vendorName ? ` - ${b.vendorName}` : ""}`,
      lines: [
        { account: await getExpenseAccount(b.category), debit: amount },
        { account: status === "Paid" ? await getCashBankAccount(b.paymentMode) : await sys("OUTSTANDING_EXP"), credit: amount },
      ],
    });
    expense.voucher = voucher._id;
    await expense.save();
  } catch (e) {
    await Voucher.deleteMany({ refId: expense._id });
    await Expense.deleteOne({ _id: expense._id });
    throw e;
  }

  await audit(req, "CREATE", "Expense", expense, { amount, category: b.category });
  res.status(201).json(expense);
};

const getExpenses = async (req, res) => {
  res.json(await Expense.find({}).sort({ expenseDate: -1, createdAt: -1 }));
};

// Settle a pending expense: Dr Outstanding Expenses / Cr Cash-Bank
const payExpense = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw httpError(404, "Expense not found");
  if (expense.status !== "Pending") throw httpError(400, "Only pending expenses can be paid");

  const date = toDate(req.body?.date);
  await postVoucher({
    type: "Payment", date, refModel: "Expense", refId: expense._id, user: req.user,
    narration: `Payment of expense ${expense.expenseNumber} - ${expense.title}`,
    lines: [
      { account: await sys("OUTSTANDING_EXP"), debit: expense.amount },
      { account: await getCashBankAccount(req.body?.paymentMode || expense.paymentMode), credit: expense.amount },
    ],
  });
  expense.status = "Paid";
  if (req.body?.paymentMode) expense.paymentMode = req.body.paymentMode;
  await expense.save();
  await audit(req, "UPDATE", "Expense", expense, { action: "paid" });
  res.json(expense);
};

const cancelExpense = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw httpError(404, "Expense not found");
  if (expense.status === "Cancelled") throw httpError(400, "Already cancelled");

  const vouchers = await Voucher.find({ refId: expense._id, status: "Posted", reversalOf: { $exists: false } });
  for (const v of vouchers) await reverseVoucher(v._id, req.user, req.body?.reason);
  expense.status = "Cancelled";
  await expense.save();
  await audit(req, "CANCEL", "Expense", expense, { reason: req.body?.reason });
  res.json(expense);
};

module.exports = { createExpense, getExpenses, payExpense, cancelExpense };
