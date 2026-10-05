const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Party = require("../models/Party");
const Voucher = require("../models/Voucher");
const { getPartyAccount, getCashBankAccount, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { round2, httpError, toDate, statusFor } = require("../services/utils");

const modelFor = (kind) => (kind === "Payment" ? Purchase : Invoice);
const dateOf = (d) => d.invoiceDate || d.billDate;
const numberOf = (d) => d.invoiceNumber || d.purchaseNumber;

const openDocs = (kind, partyId) =>
  modelFor(kind).find({ party: partyId, cancelled: { $ne: true }, status: { $in: ["Pending", "Partial"] } }).sort({ createdAt: 1 });

// Open (unpaid) invoices / bills of a party, oldest first - used by the allocation screen
const getOutstanding = async (req, res) => {
  const kind = req.query.kind === "Payment" ? "Payment" : "Receipt";
  if (!req.query.party) throw httpError(400, "party is required");
  const docs = await openDocs(kind, req.query.party);
  res.json(docs.map((d) => ({ _id: d._id, number: numberOf(d), date: dateOf(d), dueDate: d.dueDate, grandTotal: d.grandTotal, outstanding: d.outstanding })));
};

// Receipt: Dr Cash/Bank / Cr Customer      Payment: Dr Supplier / Cr Cash/Bank
const createPayment = async (req, res) => {
  const b = req.body || {};
  const kind = b.kind === "Payment" ? "Payment" : "Receipt";
  const party = await Party.findById(b.party?._id || b.party);
  if (!party) throw httpError(400, "Please select a party");
  const amount = round2(b.amount);
  if (!(amount > 0)) throw httpError(400, "Amount must be greater than 0");
  const date = toDate(b.date);
  await assertOpenPeriod(date);

  const docs = await openDocs(kind, party._id);
  let allocations = (b.allocations || []).map((a) => ({ doc: String(a.doc), amount: round2(a.amount) })).filter((a) => a.amount > 0);

  if (!allocations.length && b.autoAllocate !== false) {
    let rem = amount; // oldest first
    for (const d of docs) {
      if (rem <= 0.005) break;
      const a = round2(Math.min(rem, d.outstanding));
      if (a > 0) { allocations.push({ doc: String(d._id), amount: a }); rem = round2(rem - a); }
    }
  }

  const byId = new Map(docs.map((d) => [String(d._id), d]));
  let allocated = 0;
  for (const a of allocations) {
    const d = byId.get(a.doc);
    if (!d) throw httpError(400, "Allocated document is not open for this party");
    if (a.amount > d.outstanding + 0.005) throw httpError(400, `${numberOf(d)}: allocation ${a.amount} exceeds outstanding ${d.outstanding}`);
    allocated = round2(allocated + a.amount);
  }
  if (allocated > amount + 0.005) throw httpError(400, "Allocated amount is more than the amount received/paid");

  const cash = await getCashBankAccount(b.mode, b.account);
  const partyAcc = await getPartyAccount(party);
  const paymentNumber = await nextNumber(kind === "Receipt" ? "REC" : "PAY", date);

  const payment = await Payment.create({
    paymentNumber, kind, party: party._id, date, amount, mode: b.mode || "Bank", account: cash,
    reference: b.reference, narration: b.narration, createdBy: req.user?._id,
    allocations: allocations.map((a) => ({ doc: a.doc, docModel: kind === "Receipt" ? "Invoice" : "Purchase", docNo: numberOf(byId.get(a.doc)), amount: a.amount })),
  });

  try {
    const voucher = await postVoucher({
      type: kind, voucherNo: paymentNumber, date, party: party._id, refModel: "Payment", refId: payment._id, user: req.user,
      narration: b.narration || `${kind} ${kind === "Receipt" ? "from" : "to"} ${party.name}${b.reference ? ` (${b.reference})` : ""}`,
      lines: kind === "Receipt"
        ? [{ account: cash, debit: amount }, { account: partyAcc, credit: amount }]
        : [{ account: partyAcc, debit: amount }, { account: cash, credit: amount }],
    });
    payment.voucher = voucher._id;
    await payment.save();
  } catch (e) {
    await Voucher.deleteMany({ refId: payment._id });
    await Payment.deleteOne({ _id: payment._id });
    throw e;
  }

  for (const a of allocations) {
    const d = byId.get(a.doc);
    d.paidAmount = round2(d.paidAmount + a.amount);
    d.status = statusFor(d.grandTotal, d.paidAmount, d.adjustedAmount);
    await d.save();
  }

  await audit(req, "CREATE", "Payment", payment, { kind, amount, party: party.name });
  res.status(201).json(payment);
};

const getPayments = async (req, res) => {
  const filter = req.query.kind ? { kind: req.query.kind } : {};
  res.json(await Payment.find(filter).populate("party").sort({ date: -1, createdAt: -1 }));
};

const cancelPayment = async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, "Payment not found");
  if (payment.cancelled) throw httpError(400, "Already cancelled");

  if (payment.voucher) await reverseVoucher(payment.voucher, req.user, req.body?.reason);
  for (const a of payment.allocations) {
    const d = await modelFor(payment.kind).findById(a.doc);
    if (!d) continue;
    d.paidAmount = round2(Math.max(0, d.paidAmount - a.amount));
    d.status = statusFor(d.grandTotal, d.paidAmount, d.adjustedAmount);
    await d.save();
  }
  payment.cancelled = true;
  await payment.save();
  await audit(req, "CANCEL", "Payment", payment, { reason: req.body?.reason });
  res.json(payment);
};

module.exports = { getOutstanding, createPayment, getPayments, cancelPayment };
