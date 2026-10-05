const Purchase = require("../models/Purchase");
const Party = require("../models/Party");
const Voucher = require("../models/Voucher");
const StockMovement = require("../models/StockMovement");
const Note = require("../models/Note");
const { computeLines, getStateType } = require("../services/gst");
const { recordStock, reverseStock } = require("../services/stock");
const { sys, getPartyAccount, taxLines, getCompany, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { httpError, toDate, addDays } = require("../services/utils");

// Purchase bill: Dr Purchases + Input GST (ITC) / Cr Supplier, stock goes IN at purchase rate
const createPurchase = async (req, res) => {
  const b = req.body || {};
  const party = await Party.findById(b.party?._id || b.party);
  if (!party) throw httpError(400, "Please select a valid supplier");
  const billNumber = String(b.billNumber || "").trim();
  if (!billNumber) throw httpError(400, "Supplier bill number is required");
  if (await Purchase.exists({ party: party._id, billNumber, cancelled: { $ne: true } })) {
    throw httpError(409, `Bill ${billNumber} is already recorded for ${party.name}`); // duplicate prevention
  }

  const company = await getCompany();
  const stateType = getStateType(company, party);
  const calc = computeLines(b.items, stateType);
  for (const l of calc.lines) if (!l.item) throw httpError(400, `Item "${l.name}" is not linked to inventory`);

  const date = toDate(b.billDate);
  await assertOpenPeriod(date);

  const purchaseNumber = await nextNumber("PUR", date);
  const purchase = await Purchase.create({
    purchaseNumber, billNumber, party: party._id, billDate: date,
    dueDate: b.dueDate ? toDate(b.dueDate) : addDays(date, company.creditDays || 30),
    items: calc.lines, subTotal: calc.subTotal, cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst,
    gstAmount: calc.gstAmount, grandTotal: calc.grandTotal, stateType, notes: b.notes, createdBy: req.user?._id,
  });

  try {
    const voucher = await postVoucher({
      type: "Purchase", voucherNo: purchaseNumber, date, party: party._id, refModel: "Purchase", refId: purchase._id,
      narration: `Purchase bill ${billNumber} from ${party.name}`, user: req.user,
      lines: [
        { account: await sys("PURCHASES"), debit: calc.subTotal },
        ...(await taxLines("IN", calc, "debit")),
        { account: await getPartyAccount(party), credit: calc.grandTotal },
      ],
    });
    purchase.voucher = voucher._id;
    await purchase.save();
    await recordStock(calc.lines, { date, direction: "IN", kind: "Purchase", useRate: true, refModel: "Purchase", refId: purchase._id, refNo: purchaseNumber });
  } catch (e) {
    await Voucher.deleteMany({ refId: purchase._id });
    await StockMovement.deleteMany({ refId: purchase._id });
    await Purchase.deleteOne({ _id: purchase._id });
    throw e;
  }

  await audit(req, "CREATE", "Purchase", purchase, { grandTotal: purchase.grandTotal, party: party.name });
  res.status(201).json(purchase);
};

const getPurchases = async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Purchase.find(filter).populate("party").sort({ billDate: -1, createdAt: -1 }));
};

const getPurchase = async (req, res) => {
  const p = await Purchase.findById(req.params.id).populate("party");
  if (!p) throw httpError(404, "Purchase not found");
  res.json(p);
};

const cancelPurchase = async (req, res) => {
  const p = await Purchase.findById(req.params.id);
  if (!p) throw httpError(404, "Purchase not found");
  if (p.cancelled) throw httpError(400, "Purchase is already cancelled");
  if (p.paidAmount > 0) throw httpError(400, "Payments are allocated to this bill. Cancel those payments first.");
  if (await Note.exists({ against: p._id, cancelled: { $ne: true } })) throw httpError(400, "Credit/debit notes exist against this bill. Cancel them first.");

  if (p.voucher) await reverseVoucher(p.voucher, req.user, req.body?.reason);
  await reverseStock(p._id, { date: p.billDate, refNo: `${p.purchaseNumber}-R` });
  p.cancelled = true;
  p.status = "Cancelled";
  p.cancelReason = req.body?.reason;
  await p.save();
  await audit(req, "CANCEL", "Purchase", p, { reason: req.body?.reason });
  res.json(p);
};

module.exports = { createPurchase, getPurchases, getPurchase, cancelPurchase };
