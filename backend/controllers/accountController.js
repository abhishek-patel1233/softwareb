const Account = require("../models/Account");
const Voucher = require("../models/Voucher");
const AuditLog = require("../models/AuditLog");
const { stateCodeOf } = require("../services/gst");
const { ensureSystemAccounts, syncPartyAccounts, closingBalances, getCompany, postVoucher, reverseVoucher, audit } = require("../services/accounting");
const { round2, httpError, toDate, endOfDay, parseAsOn } = require("../services/utils");

// ---------- Chart of accounts ----------
const getAccounts = async (req, res) => {
  await ensureSystemAccounts();
  await syncPartyAccounts();
  if (req.query.balances) {
    const rows = await closingBalances(parseAsOn(req.query));
    return res.json(rows.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)));
  }
  res.json(await Account.find({}).sort({ group: 1, name: 1 }));
};

const createAccount = async (req, res) => {
  const { name, group, subGroup, openingBalance, openingType } = req.body || {};
  if (!name?.trim()) throw httpError(400, "Account name is required");
  if (!Account.schema.path("group").enumValues.includes(group)) throw httpError(400, "Invalid account group");
  if (await Account.exists({ name: name.trim(), group })) throw httpError(409, "An account with this name already exists in the group");

  // only balance-sheet ledgers carry opening balances (Dr = +, Cr = -)
  const ob = ["Asset", "Liability", "Equity"].includes(group) ? round2(openingBalance) * (openingType === "Cr" ? -1 : 1) : 0;
  const acc = await Account.create({ name: name.trim(), group, subGroup: subGroup || "", opening: ob });
  await audit(req, "CREATE", "Account", acc, { name: acc.name, group });
  res.status(201).json(acc);
};

// ---------- Vouchers (manual Journal / Contra; the rest are created by their own modules) ----------
const getVouchers = async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = toDate(req.query.from);
    if (req.query.to) filter.date.$lte = endOfDay(toDate(req.query.to));
  }
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  res.json(await Voucher.find(filter).populate("party", "name").populate("lines.account", "name").sort({ date: -1, createdAt: -1 }).limit(limit));
};

const getVoucher = async (req, res) => {
  const v = await Voucher.findById(req.params.id).populate("party", "name").populate("lines.account", "name group");
  if (!v) throw httpError(404, "Voucher not found");
  res.json(v);
};

const createVoucher = async (req, res) => {
  const b = req.body || {};
  if (!["Journal", "Contra"].includes(b.type)) throw httpError(400, "Only Journal and Contra vouchers can be entered manually");
  const lines = (b.lines || []).map((l) => ({ account: l.account, debit: l.debit, credit: l.credit }));

  if (b.type === "Contra") {
    const accs = await Account.find({ _id: { $in: lines.map((l) => l.account) } }).lean();
    if (!accs.length || accs.some((a) => !["Cash", "Bank"].includes(a.subGroup))) throw httpError(400, "Contra vouchers can only use cash/bank accounts");
  }
  const v = await postVoucher({ type: b.type, date: b.date, narration: b.narration, lines, user: req.user });
  await audit(req, "CREATE", "Voucher", v, { type: b.type, total: v.total });
  res.status(201).json(v);
};

const reverseManualVoucher = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) throw httpError(404, "Voucher not found");
  if (v.refModel) throw httpError(400, "This voucher belongs to a document. Cancel the source document instead.");
  const rev = await reverseVoucher(v._id, req.user, req.body?.reason);
  await audit(req, "REVERSE", "Voucher", v, { reason: req.body?.reason, reversal: rev.voucherNo });
  res.json(rev);
};

// ---------- Company settings ----------
const getSettings = async (req, res) => res.json(await getCompany());

const updateSettings = async (req, res) => {
  const b = req.body || {};
  const c = await getCompany();
  for (const k of ["name", "gstin", "address", "state", "phone", "email", "bankName", "bankAccount", "ifsc", "upi"]) if (b[k] !== undefined) c[k] = b[k];
  if (b.creditDays !== undefined) c.creditDays = Math.max(0, Number(b.creditDays) || 0);
  if (b.allowNegativeStock !== undefined) c.allowNegativeStock = !!b.allowNegativeStock;
  if (b.lockedUpto !== undefined) c.lockedUpto = b.lockedUpto ? toDate(b.lockedUpto) : null;

  // seller state code drives CGST/SGST vs IGST, so keep it in sync with GSTIN / state name
  c.stateCode = stateCodeOf({ gstin: c.gstin, state: c.state }) || c.stateCode;
  await c.save();
  await audit(req, "UPDATE", "Company", c, { fields: Object.keys(b) });
  res.json(c);
};

// ---------- Audit trail ----------
const getAudit = async (req, res) => {
  const filter = {};
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = toDate(req.query.from);
    if (req.query.to) filter.createdAt.$lte = endOfDay(toDate(req.query.to));
  }
  res.json(await AuditLog.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 200, 1000)));
};

module.exports = { getAccounts, createAccount, getVouchers, getVoucher, createVoucher, reverseManualVoucher, getSettings, updateSettings, getAudit };
