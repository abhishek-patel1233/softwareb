// Accounting engine: the single place that creates/reverses vouchers.
// Every module (sales, purchase, payments, notes, expenses) posts through postVoucher().
const Account = require("../models/Account");
const Voucher = require("../models/Voucher");
const Counter = require("../models/Counter");
const Company = require("../models/Company");
const Party = require("../models/Party");
const AuditLog = require("../models/AuditLog");
const { round2, httpError, pad, toDate, fyStartYear } = require("./utils");

// ---------- system accounts ----------
const TAX = "Duties & Taxes";
const SYSTEM_ACCOUNTS = [
  { key: "CASH", name: "Cash in Hand", group: "Asset", subGroup: "Cash" },
  { key: "BANK", name: "Bank Account", group: "Asset", subGroup: "Bank" },
  { key: "SALES", name: "Sales", group: "Income", subGroup: "Sales" },
  { key: "SALES_RETURN", name: "Sales Returns", group: "Income", subGroup: "Sales" },
  { key: "PURCHASES", name: "Purchases", group: "Expense", subGroup: "Purchase" },
  { key: "PURCHASE_RETURN", name: "Purchase Returns", group: "Expense", subGroup: "Purchase" },
  { key: "OUT_CGST", name: "Output CGST", group: "Liability", subGroup: TAX },
  { key: "OUT_SGST", name: "Output SGST", group: "Liability", subGroup: TAX },
  { key: "OUT_IGST", name: "Output IGST", group: "Liability", subGroup: TAX },
  { key: "IN_CGST", name: "Input CGST (ITC)", group: "Asset", subGroup: TAX },
  { key: "IN_SGST", name: "Input SGST (ITC)", group: "Asset", subGroup: TAX },
  { key: "IN_IGST", name: "Input IGST (ITC)", group: "Asset", subGroup: TAX },
  { key: "OUTSTANDING_EXP", name: "Outstanding Expenses", group: "Liability", subGroup: "Current Liabilities" },
].map((a) => ({ ...a, isSystem: true }));

let seeding = null;
let sysMap = null;

const ensureSystemAccounts = () => {
  if (!seeding) {
    seeding = Account.bulkWrite(
      SYSTEM_ACCOUNTS.map(({ key, ...rest }) => ({
        updateOne: { filter: { key }, update: { $setOnInsert: rest }, upsert: true },
      }))
    ).catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
};

const sys = async (key) => {
  await ensureSystemAccounts();
  if (!sysMap || !sysMap[key]) {
    const accs = await Account.find({ key: { $exists: true } }).select("key");
    sysMap = Object.fromEntries(accs.map((a) => [a.key, a._id]));
  }
  return sysMap[key];
};

// ---------- party ledgers ----------
// One ledger per Party: Customer => Sundry Debtor (Dr), Supplier => Sundry Creditor (Cr)
const partyAccountDef = (p) => ({
  group: p.type === "Supplier" ? "Liability" : "Asset",
  subGroup: p.type === "Supplier" ? "Sundry Creditors" : "Sundry Debtors",
  opening: (p.type === "Supplier" ? -1 : 1) * Number(p.openingBalance || 0),
});

const getPartyAccount = async (partyOrId) => {
  const p = partyOrId?._id ? partyOrId : await Party.findById(partyOrId);
  if (!p) throw httpError(400, "Party not found");
  let acc = await Account.findOne({ party: p._id });
  if (!acc) {
    try {
      acc = await Account.create({ name: p.name, party: p._id, ...partyAccountDef(p) });
    } catch (e) {
      if (e.code !== 11000) throw e;
      acc = await Account.findOne({ party: p._id });
    }
  }
  return acc._id;
};

// Makes sure every Party has a ledger (and keeps the name in sync) before reports run
const syncPartyAccounts = async () => {
  const parties = await Party.find({}).lean();
  if (!parties.length) return;
  await Account.bulkWrite(
    parties.map((p) => ({
      updateOne: {
        filter: { party: p._id },
        update: { $set: { name: p.name }, $setOnInsert: partyAccountDef(p) },
        upsert: true,
      },
    }))
  );
};

const getExpenseAccount = async (category) => {
  const name = String(category || "General Expenses").trim();
  let acc = await Account.findOne({ name, group: "Expense", subGroup: "Indirect Expenses" });
  if (!acc) acc = await Account.create({ name, group: "Expense", subGroup: "Indirect Expenses" });
  return acc._id;
};

// Cash/bank ledger used for a payment mode (explicit account wins)
const getCashBankAccount = async (mode, accountId) => {
  if (accountId) {
    const a = await Account.findById(accountId);
    if (!a || !["Cash", "Bank"].includes(a.subGroup)) throw httpError(400, "Selected account is not a cash/bank ledger");
    return a._id;
  }
  return sys(String(mode || "").toLowerCase() === "cash" ? "CASH" : "BANK");
};

const taxLines = async (prefix, { cgst, sgst, igst }, side) => {
  const out = [];
  for (const [k, v] of [["CGST", cgst], ["SGST", sgst], ["IGST", igst]]) {
    if (v > 0) out.push({ account: await sys(`${prefix}_${k}`), [side]: v });
  }
  return out;
};

// ---------- company / period lock / numbering ----------
const getCompany = async () => (await Company.findOne()) || (await Company.create({}));

const assertOpenPeriod = async (date) => {
  const c = await getCompany();
  if (c.lockedUpto && date <= c.lockedUpto) {
    throw httpError(400, `Period is locked up to ${c.lockedUpto.toISOString().slice(0, 10)}. Posting is not allowed.`);
  }
};

const PREFIX = { Sales: "INV", Purchase: "PUR", Receipt: "REC", Payment: "PAY", CreditNote: "CN", DebitNote: "DN", Journal: "JV", Contra: "CNT", Expense: "EXP" };

// Atomic, gap-free per financial year: INV-2026-0001
const nextNumber = async (prefix, date) => {
  const fy = fyStartYear(toDate(date));
  const c = await Counter.findOneAndUpdate({ key: `${prefix}:${fy}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `${prefix}-${fy}-${pad(c.seq)}`;
};

// ---------- posting ----------
const postVoucher = async ({ type, voucherNo, date, narration, lines, party, refModel, refId, user }) => {
  const d = toDate(date);
  await assertOpenPeriod(d);

  const clean = (lines || [])
    .map((l) => ({ account: l.account, debit: round2(l.debit), credit: round2(l.credit) }))
    .filter((l) => l.debit || l.credit);

  if (clean.length < 2) throw httpError(400, "A voucher needs at least two lines");
  for (const l of clean) {
    if (!l.account) throw httpError(400, "Voucher line without account");
    if (l.debit < 0 || l.credit < 0) throw httpError(400, "Negative amounts are not allowed");
    if (l.debit > 0 && l.credit > 0) throw httpError(400, "A line cannot have both debit and credit");
  }
  const dr = round2(clean.reduce((s, l) => s + l.debit, 0));
  const cr = round2(clean.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(dr - cr) > 0.005) throw httpError(400, `Voucher not balanced: debit ${dr} ≠ credit ${cr}`);

  return Voucher.create({
    voucherNo: voucherNo || (await nextNumber(PREFIX[type], d)),
    type, date: d, narration, party, lines: clean, total: dr, refModel, refId,
    createdBy: user?._id, createdByName: user?.name,
  });
};

// Reversal = a mirror voucher (history is never deleted). Both stay in the day book and net to zero.
const reverseVoucher = async (voucherId, user, reason) => {
  const v = await Voucher.findById(voucherId);
  if (!v) throw httpError(404, "Voucher not found");
  if (v.status === "Reversed" || v.reversalOf) throw httpError(400, "Voucher is already reversed");
  await assertOpenPeriod(v.date);

  const rev = await Voucher.create({
    voucherNo: `${v.voucherNo}-R`, type: v.type, date: v.date,
    narration: `Reversal of ${v.voucherNo}${reason ? ` - ${reason}` : ""}`,
    party: v.party, total: v.total, reversalOf: v._id, refModel: v.refModel, refId: v.refId,
    lines: v.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
    createdBy: user?._id, createdByName: user?.name,
  });
  v.status = "Reversed";
  await v.save();
  return rev;
};

const audit = async (req, action, entity, doc, details) => {
  try {
    await AuditLog.create({
      user: req?.user?._id, userName: req?.user?.name, role: req?.user?.role,
      action, entity, entityId: doc?._id,
      docNo: doc?.invoiceNumber || doc?.purchaseNumber || doc?.paymentNumber || doc?.noteNumber || doc?.expenseNumber || doc?.voucherNo,
      details, ip: req?.ip,
    });
  } catch (e) {
    console.error("Audit log failed:", e.message); // auditing must never break a transaction
  }
};

// ---------- balances ----------
// Sums voucher-line debit/credit grouped by `key` (e.g. "$lines.account", "$type", "$date").
// One accumulator per pass keeps the pipeline portable across MongoDB-compatible servers.
const groupLines = async ({ match = {}, accountIds, key }) => {
  const base = [{ $match: match }, { $unwind: "$lines" }];
  if (accountIds) base.push({ $match: { "lines.account": { $in: accountIds } } });
  const pass = (field) => Voucher.aggregate([...base, { $group: { _id: key, total: { $sum: `$lines.${field}` } } }]);
  const [dr, cr] = await Promise.all([pass("debit"), pass("credit")]);

  const out = new Map();
  const slot = (id) => {
    const k = id instanceof Date ? id.toISOString() : String(id);
    if (!out.has(k)) out.set(k, { id, debit: 0, credit: 0 });
    return out.get(k);
  };
  dr.forEach((r) => (slot(r._id).debit = round2(r.total)));
  cr.forEach((r) => (slot(r._id).credit = round2(r.total)));
  return out;
};

const sumByAccount = async ({ from, to, accountIds } = {}) => {
  const match = {};
  if (from || to) match.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  return groupLines({ match, accountIds, key: "$lines.account" });
};

// Closing balance of every ledger as on a date: signed (Dr +, Cr -)
const closingBalances = async (asOn) => {
  await ensureSystemAccounts();
  await syncPartyAccounts();
  const [accounts, mov] = await Promise.all([Account.find({}).lean(), sumByAccount({ to: asOn })]);
  return accounts.map((a) => {
    const m = mov.get(String(a._id)) || { debit: 0, credit: 0 };
    return { ...a, debit: m.debit, credit: m.credit, balance: round2((a.opening || 0) + m.debit - m.credit) };
  });
};

module.exports = {
  SYSTEM_ACCOUNTS, ensureSystemAccounts, sys, getPartyAccount, syncPartyAccounts, getExpenseAccount,
  getCashBankAccount, taxLines, getCompany, assertOpenPeriod, nextNumber, postVoucher, reverseVoucher,
  audit, groupLines, sumByAccount, closingBalances,
};
