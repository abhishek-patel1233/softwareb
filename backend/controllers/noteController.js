const Note = require("../models/Note");
const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Voucher = require("../models/Voucher");
const StockMovement = require("../models/StockMovement");
const { computeLines } = require("../services/gst");
const { recordStock, reverseStock } = require("../services/stock");
const { sys, getPartyAccount, taxLines, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { round2, httpError, toDate, statusFor } = require("../services/utils");

// A note that reduces what the other party owes us / what we owe them
const reduces = (n) => (n.againstModel === "Invoice" && n.kind === "Credit") || (n.againstModel === "Purchase" && n.kind === "Debit");
const signedAdj = (n) => (reduces(n) ? n.grandTotal : -n.grandTotal);

const createNote = async (req, res) => {
  const b = req.body || {};
  const kind = b.kind === "Debit" ? "Debit" : "Credit";
  const againstModel = b.againstModel === "Purchase" ? "Purchase" : "Invoice";
  const Doc = againstModel === "Purchase" ? Purchase : Invoice;

  const orig = await Doc.findById(b.against);
  if (!orig || orig.cancelled) throw httpError(400, "Original document not found or cancelled");

  const calc = computeLines(b.items, orig.stateType, { noTax: orig.docType === "Bill of Supply" });
  const date = toDate(b.date);
  await assertOpenPeriod(date);

  const probe = { againstModel, kind, grandTotal: calc.grandTotal };
  if (reduces(probe) && round2(orig.adjustedAmount + calc.grandTotal) > orig.grandTotal + 0.005) {
    throw httpError(400, "Credit/debit notes cannot reduce more than the original document value");
  }

  const returnStock = !!b.returnStock && reduces(probe);
  if (returnStock) for (const l of calc.lines) if (!l.item) throw httpError(400, `Item "${l.name}" is not linked to inventory`);

  const noteNumber = await nextNumber(kind === "Credit" ? "CN" : "DN", date);
  const note = await Note.create({
    noteNumber, kind, againstModel, against: orig._id, againstNo: orig.invoiceNumber || orig.purchaseNumber,
    party: orig.party, date, reason: b.reason || "Other", returnStock, items: calc.lines,
    subTotal: calc.subTotal, cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, gstAmount: calc.gstAmount,
    grandTotal: calc.grandTotal, stateType: orig.stateType, createdBy: req.user?._id,
  });

  try {
    const partyAcc = await getPartyAccount(orig.party);
    const sales = againstModel === "Invoice";
    const taxPrefix = sales ? "OUT" : "IN";
    // value-reducing note flips the original voucher; value-increasing note repeats it
    const base = sales ? await sys(kind === "Credit" ? "SALES_RETURN" : "SALES") : await sys(kind === "Debit" ? "PURCHASE_RETURN" : "PURCHASES");
    let lines;
    if (sales && kind === "Credit") lines = [{ account: base, debit: calc.subTotal }, ...(await taxLines(taxPrefix, calc, "debit")), { account: partyAcc, credit: calc.grandTotal }];
    else if (sales) lines = [{ account: partyAcc, debit: calc.grandTotal }, { account: base, credit: calc.subTotal }, ...(await taxLines(taxPrefix, calc, "credit"))];
    else if (kind === "Debit") lines = [{ account: partyAcc, debit: calc.grandTotal }, { account: base, credit: calc.subTotal }, ...(await taxLines(taxPrefix, calc, "credit"))];
    else lines = [{ account: base, debit: calc.subTotal }, ...(await taxLines(taxPrefix, calc, "debit")), { account: partyAcc, credit: calc.grandTotal }];

    const voucher = await postVoucher({
      type: kind === "Credit" ? "CreditNote" : "DebitNote", voucherNo: noteNumber, date, party: orig.party,
      refModel: "Note", refId: note._id, user: req.user,
      narration: `${kind} note ${noteNumber} against ${note.againstNo} (${note.reason})`, lines,
    });
    note.voucher = voucher._id;
    await note.save();

    if (returnStock) {
      await recordStock(calc.lines, { date, direction: sales ? "IN" : "OUT", kind: sales ? "SalesReturn" : "PurchaseReturn", refModel: "Note", refId: note._id, refNo: noteNumber });
    }
  } catch (e) {
    await Voucher.deleteMany({ refId: note._id });
    await StockMovement.deleteMany({ refId: note._id });
    await Note.deleteOne({ _id: note._id });
    throw e;
  }

  orig.adjustedAmount = round2(orig.adjustedAmount + signedAdj(note));
  orig.status = statusFor(orig.grandTotal, orig.paidAmount, orig.adjustedAmount);
  await orig.save();

  await audit(req, "CREATE", "Note", note, { kind, against: note.againstNo, grandTotal: note.grandTotal });
  res.status(201).json(note);
};

const getNotes = async (req, res) => {
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.againstModel) filter.againstModel = req.query.againstModel;
  res.json(await Note.find(filter).populate("party").sort({ date: -1, createdAt: -1 }));
};

const cancelNote = async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw httpError(404, "Note not found");
  if (note.cancelled) throw httpError(400, "Already cancelled");

  if (note.voucher) await reverseVoucher(note.voucher, req.user, req.body?.reason);
  await reverseStock(note._id, { date: note.date, refNo: `${note.noteNumber}-R` });

  const orig = await (note.againstModel === "Purchase" ? Purchase : Invoice).findById(note.against);
  if (orig) {
    orig.adjustedAmount = round2(orig.adjustedAmount - signedAdj(note));
    orig.status = orig.cancelled ? "Cancelled" : statusFor(orig.grandTotal, orig.paidAmount, orig.adjustedAmount);
    await orig.save();
  }
  note.cancelled = true;
  await note.save();
  await audit(req, "CANCEL", "Note", note, { reason: req.body?.reason });
  res.json(note);
};

module.exports = { createNote, getNotes, cancelNote };
