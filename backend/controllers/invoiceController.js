const Invoice = require("../models/Invoice");
const Party = require("../models/Party");
const Voucher = require("../models/Voucher");
const StockMovement = require("../models/StockMovement");
const Note = require("../models/Note");
const { computeLines, getStateType } = require("../services/gst");
const { recordStock, reverseStock, stockQty, isService } = require("../services/stock");
const Item = require("../models/Item");
const { sys, getPartyAccount, taxLines, getCompany, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { httpError, toDate, addDays } = require("../services/utils");

// Create New Invoice  (posts: Dr Customer / Cr Sales + Output GST, and reduces stock)
const createInvoice = async (req, res) => {
  const b = req.body || {};
  const party = await Party.findById(b.party?._id || b.party);
  if (!party) throw httpError(400, "Please select a valid party");

  const company = await getCompany();
  const docType = b.docType === "Bill of Supply" ? "Bill of Supply" : "Tax Invoice";
  const stateType = getStateType(company, party);
  const calc = computeLines(b.items, stateType, { noTax: docType === "Bill of Supply" });

  const date = toDate(b.invoiceDate || b.createdAt);
  await assertOpenPeriod(date);

  for (const l of calc.lines) if (!l.item) throw httpError(400, `Item "${l.name}" is not linked to inventory`);

  if (!company.allowNegativeStock) {
    const ids = calc.lines.map((l) => l.item);
    const goods = new Set((await Item.find({ _id: { $in: ids } }).lean()).filter((i) => !isService(i)).map((i) => String(i._id)));
    const have = await stockQty(ids, undefined);
    const need = new Map();
    calc.lines.forEach((l) => need.set(String(l.item), (need.get(String(l.item)) || 0) + l.quantity));
    for (const [id, qty] of need) {
      if (goods.has(id) && (have.get(id) || 0) < qty) {
        const name = calc.lines.find((l) => String(l.item) === id).name;
        throw httpError(400, `Insufficient stock for "${name}" (available ${have.get(id) || 0}, required ${qty})`);
      }
    }
  }

  const invoiceNumber = await nextNumber("INV", date);
  const invoice = await Invoice.create({
    invoiceNumber, docType, party: party._id, invoiceDate: date, createdAt: date,
    dueDate: b.dueDate ? toDate(b.dueDate) : addDays(date, company.creditDays || 30),
    placeOfSupply: party.state, items: calc.lines, subTotal: calc.subTotal,
    cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, gstAmount: calc.gstAmount,
    grandTotal: calc.grandTotal, stateType, notes: b.notes, createdBy: req.user?._id,
  });

  try {
    const voucher = await postVoucher({
      type: "Sales", voucherNo: invoiceNumber, date, party: party._id, refModel: "Invoice", refId: invoice._id,
      narration: `Sales invoice ${invoiceNumber} to ${party.name}`, user: req.user,
      lines: [
        { account: await getPartyAccount(party), debit: calc.grandTotal },
        { account: await sys("SALES"), credit: calc.subTotal },
        ...(await taxLines("OUT", calc, "credit")),
      ],
    });
    invoice.voucher = voucher._id;
    await invoice.save();
    await recordStock(calc.lines, { date, direction: "OUT", kind: "Sale", refModel: "Invoice", refId: invoice._id, refNo: invoiceNumber });
  } catch (e) {
    // no multi-document transactions on a standalone MongoDB -> manual rollback
    await Voucher.deleteMany({ refId: invoice._id });
    await StockMovement.deleteMany({ refId: invoice._id });
    await Invoice.deleteOne({ _id: invoice._id });
    throw e;
  }

  await audit(req, "CREATE", "Invoice", invoice, { grandTotal: invoice.grandTotal, party: party.name });
  res.status(201).json(invoice);
};

// Get All Invoices (?status=Pending|Partial|Paid|Cancelled)
const getInvoices = async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const invoices = await Invoice.find(filter).populate("party").sort({ invoiceDate: -1, createdAt: -1 });
  res.json(invoices);
};

const getInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate("party");
  if (!invoice) throw httpError(404, "Invoice not found");
  res.json(invoice);
};

// Cancel = reverse the accounting + stock. Blocked once money/notes are attached.
const cancelInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw httpError(404, "Invoice not found");
  if (invoice.cancelled) throw httpError(400, "Invoice is already cancelled");
  if (invoice.paidAmount > 0) throw httpError(400, "Receipts are allocated to this invoice. Cancel those receipts first.");
  if (await Note.exists({ against: invoice._id, cancelled: { $ne: true } })) throw httpError(400, "Credit/debit notes exist against this invoice. Cancel them first.");

  if (invoice.voucher) await reverseVoucher(invoice.voucher, req.user, req.body?.reason);
  await reverseStock(invoice._id, { date: invoice.invoiceDate, refNo: `${invoice.invoiceNumber}-R` });

  invoice.cancelled = true;
  invoice.status = "Cancelled";
  invoice.cancelReason = req.body?.reason;
  await invoice.save();
  await audit(req, "CANCEL", "Invoice", invoice, { reason: req.body?.reason });
  res.json(invoice);
};

module.exports = { createInvoice, getInvoices, getInvoice, cancelInvoice };
