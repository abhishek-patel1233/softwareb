// All reports are derived from vouchers (the single source of financial truth),
// except ageing/GST rate tables which need document-level detail.
const Account = require("../models/Account");
const Voucher = require("../models/Voucher");
const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Party = require("../models/Party");
const Item = require("../models/Item");
const StockMovement = require("../models/StockMovement");
const { sys, closingBalances, sumByAccount, syncPartyAccounts, ensureSystemAccounts } = require("../services/accounting");
const { valuation } = require("../services/stock");
const { round2, httpError, toDate, endOfDay, parseRange, parseAsOn, fyStartYear, bucketOf } = require("../services/utils");

const sum = (arr, f = (x) => x) => round2(arr.reduce((s, x) => s + f(x), 0));
const EPOCH = new Date(0);

// ---------- Profit & Loss (periodic stock method: COGS = opening stock + purchases - closing stock) ----------
const computePnL = async (from, to) => {
  await ensureSystemAccounts();
  const accounts = await Account.find({ group: { $in: ["Income", "Expense"] } }).lean();
  const mov = await sumByAccount({ from, to, accountIds: accounts.map((a) => a._id) });
  const rows = accounts.map((a) => {
    const m = mov.get(String(a._id)) || { debit: 0, credit: 0 };
    return { name: a.name, group: a.group, subGroup: a.subGroup, credit: m.credit, debit: m.debit };
  });

  const inc = (r) => round2(r.credit - r.debit);
  const exp = (r) => round2(r.debit - r.credit);
  const sales = rows.filter((r) => r.group === "Income" && r.subGroup === "Sales").map((r) => ({ label: r.name, amount: inc(r) }));
  const otherIncome = rows.filter((r) => r.group === "Income" && r.subGroup !== "Sales").map((r) => ({ label: r.name, amount: inc(r) })).filter((r) => r.amount);
  const purchases = rows.filter((r) => r.group === "Expense" && r.subGroup === "Purchase").map((r) => ({ label: r.name, amount: exp(r) }));
  const expenses = rows.filter((r) => r.group === "Expense" && r.subGroup !== "Purchase").map((r) => ({ label: r.name, amount: exp(r) })).filter((r) => r.amount);

  const [opening, closing] = await Promise.all([valuation(new Date(from.getTime() - 1)), valuation(to)]);
  const netSales = sum(sales, (r) => r.amount);
  const netPurchases = sum(purchases, (r) => r.amount);
  const cogs = round2(opening.total + netPurchases - closing.total);
  const grossProfit = round2(netSales - cogs);
  const totalOther = sum(otherIncome, (r) => r.amount);
  const totalExpenses = sum(expenses, (r) => r.amount);
  const netProfit = round2(grossProfit + totalOther - totalExpenses);

  return {
    from, to, netSales, cogs, grossProfit, netProfit, openingStock: opening.total, closingStock: closing.total, netPurchases, totalExpenses,
    sections: [
      { title: "Income", rows: sales, total: { label: "Net Sales", amount: netSales } },
      {
        title: "Cost of Goods Sold",
        rows: [{ label: "Opening Stock", amount: opening.total }, ...purchases, { label: "Less: Closing Stock", amount: -closing.total }],
        total: { label: "Cost of Goods Sold", amount: cogs },
      },
      { title: "Gross Profit", rows: [], total: { label: "Gross Profit", amount: grossProfit } },
      { title: "Other Income", rows: otherIncome, total: { label: "Total Other Income", amount: totalOther } },
      { title: "Expenses", rows: expenses, total: { label: "Total Expenses", amount: totalExpenses } },
      { title: "Result", rows: [], total: { label: netProfit >= 0 ? "Net Profit" : "Net Loss", amount: netProfit } },
    ],
  };
};

const profitLoss = async (req, res) => {
  const { from, to } = parseRange(req.query);
  res.json(await computePnL(from, to));
};

// ---------- Trial balance ----------
const trialBalance = async (req, res) => {
  const asOn = parseAsOn(req.query);
  const bal = await closingBalances(asOn);
  const rows = bal
    .filter((a) => a.balance !== 0 || a.debit || a.credit)
    .map((a) => ({ name: a.name, group: a.group, subGroup: a.subGroup, debit: a.balance > 0 ? a.balance : 0, credit: a.balance < 0 ? -a.balance : 0 }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  // opening balances entered without a counter-entry show up as a difference (like Tally)
  const diff = round2(sum(rows, (r) => r.debit) - sum(rows, (r) => r.credit));
  if (Math.abs(diff) > 0.005) rows.push({ name: "Difference in Opening Balances", group: "-", subGroup: "", debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0 });
  res.json({ asOn, rows, totals: { debit: sum(rows, (r) => r.debit), credit: sum(rows, (r) => r.credit) } });
};

// ---------- Balance sheet ----------
const balanceSheet = async (req, res) => {
  const asOn = parseAsOn(req.query);
  const [bal, pnl, closing, s0] = await Promise.all([closingBalances(asOn), computePnL(EPOCH, asOn), valuation(asOn), valuation(new Date(-1))]);

  const group = (g, sign) => {
    const bySub = new Map();
    bal.filter((a) => a.group === g && a.balance !== 0).forEach((a) => {
      const k = a.subGroup || "Other";
      if (!bySub.has(k)) bySub.set(k, []);
      bySub.get(k).push({ label: a.name, amount: round2(a.balance * sign) });
    });
    return [...bySub.entries()].map(([title, rows]) => ({ title, rows, total: { label: `Total ${title}`, amount: sum(rows, (r) => r.amount) } }));
  };

  const assets = group("Asset", 1);
  if (closing.total) assets.push({ title: "Inventory", rows: [{ label: "Closing Stock", amount: closing.total }], total: { label: "Total Inventory", amount: closing.total } });
  const liabilities = group("Liability", -1);
  const equity = group("Equity", -1);

  // opening balances (ledger openings + opening stock) that have no counter-entry => opening capital
  const openingEquity = round2(sum(bal, (a) => a.opening || 0) + s0.total);
  const eqExtra = [];
  if (Math.abs(openingEquity) > 0.005) eqExtra.push({ label: "Opening Balance Equity", amount: openingEquity });
  eqExtra.push({ label: pnl.netProfit >= 0 ? "Net Profit (cumulative)" : "Net Loss (cumulative)", amount: pnl.netProfit });
  equity.push({ title: "Reserves", rows: eqExtra, total: { label: "Total Reserves", amount: sum(eqExtra, (r) => r.amount) } });

  const totalAssets = sum(assets, (s) => s.total.amount);
  const totalLiab = sum(liabilities, (s) => s.total.amount) + sum(equity, (s) => s.total.amount);
  res.json({ asOn, assets, liabilities: [...liabilities, ...equity], totalAssets, totalLiabilities: round2(totalLiab), difference: round2(totalAssets - totalLiab) });
};

// ---------- Ledger ----------
const ledger = async (req, res) => {
  if (!req.query.account) throw httpError(400, "account is required");
  await syncPartyAccounts();
  const acc = await Account.findById(req.query.account).lean();
  if (!acc) throw httpError(404, "Account not found");
  const { from, to } = parseRange(req.query);

  const before = (await sumByAccount({ to: new Date(from.getTime() - 1), accountIds: [acc._id] })).get(String(acc._id)) || { debit: 0, credit: 0 };
  const opening = round2((acc.opening || 0) + before.debit - before.credit);

  const vouchers = await Voucher.find({ "lines.account": acc._id, date: { $gte: from, $lte: to } }).sort({ date: 1, createdAt: 1 }).lean();
  const names = new Map((await Account.find({}).select("name").lean()).map((a) => [String(a._id), a.name]));

  let running = opening;
  const rows = [];
  for (const v of vouchers) {
    const mine = v.lines.filter((l) => String(l.account) === String(acc._id));
    const others = [...new Set(v.lines.filter((l) => String(l.account) !== String(acc._id)).map((l) => names.get(String(l.account))))].join(", ");
    const debit = sum(mine, (l) => l.debit), credit = sum(mine, (l) => l.credit);
    running = round2(running + debit - credit);
    rows.push({ date: v.date, voucherNo: v.voucherNo, type: v.type, particulars: others, narration: v.narration, debit, credit, balance: running });
  }
  res.json({ account: acc, from, to, opening, rows, closing: running, totals: { debit: sum(rows, (r) => r.debit), credit: sum(rows, (r) => r.credit) } });
};

// ---------- Day book ----------
const dayBook = async (req, res) => {
  const { from, to } = parseRange(req.query);
  const filter = { date: { $gte: from, $lte: to } };
  if (req.query.type) filter.type = req.query.type;
  const vs = await Voucher.find(filter).populate("party", "name").sort({ date: 1, createdAt: 1 }).lean();
  res.json({ from, to, rows: vs.map((v) => ({ date: v.date, voucherNo: v.voucherNo, type: v.type, party: v.party?.name || "", narration: v.narration, amount: v.total, status: v.reversalOf ? "Reversal" : v.status })) });
};

// ---------- Ageing (receivable / payable) ----------
const computeAgeing = async (payable, asOn) => {
  const Model = payable ? Purchase : Invoice;
  const dateField = payable ? "billDate" : "invoiceDate";

  const [docs, parties, bal] = await Promise.all([
    Model.find({ cancelled: { $ne: true }, status: { $in: ["Pending", "Partial"] }, [dateField]: { $lte: asOn } }).lean(),
    Party.find({ type: payable ? "Supplier" : "Customer" }).lean(),
    closingBalances(asOn),
  ]);

  const rows = new Map(parties.map((p) => [String(p._id), { party: p.name, current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, other: 0, total: 0 }]));
  const docTotal = new Map();
  for (const d of docs) {
    const r = rows.get(String(d.party));
    if (!r) continue;
    const out = round2(d.grandTotal - d.paidAmount - d.adjustedAmount);
    if (out <= 0.005) continue;
    const due = d.dueDate || d[dateField];
    r[bucketOf(Math.floor((asOn - due) / 86400000))] += out;
    docTotal.set(String(d.party), round2((docTotal.get(String(d.party)) || 0) + out));
  }
  // anything in the party ledger that isn't covered by open documents (opening balance, advances) goes to "other"
  for (const a of bal.filter((a) => a.party)) {
    const r = rows.get(String(a.party));
    if (!r) continue;
    r.other = round2((payable ? -a.balance : a.balance) - (docTotal.get(String(a.party)) || 0));
  }
  const out = [...rows.values()].map((r) => ({ ...r, total: round2(r.current + r.d30 + r.d60 + r.d90 + r.d90plus + r.other) })).filter((r) => r.total !== 0 || r.other !== 0);
  const totals = Object.fromEntries(["current", "d30", "d60", "d90", "d90plus", "other", "total"].map((k) => [k, sum(out, (r) => r[k])]));
  return { kind: payable ? "payable" : "receivable", asOn, rows: out.sort((a, b) => b.total - a.total), totals };
};

const ageing = async (req, res) => res.json(await computeAgeing(req.query.kind === "payable", parseAsOn(req.query)));

// ---------- GST summary ----------
const gstSummary = async (req, res) => {
  const { from, to } = parseRange(req.query);
  const [ids, invoices] = await Promise.all([
    Promise.all(["OUT_CGST", "OUT_SGST", "OUT_IGST", "IN_CGST", "IN_SGST", "IN_IGST"].map(async (k) => [k, await sys(k)])),
    Invoice.find({ cancelled: { $ne: true }, docType: "Tax Invoice", invoiceDate: { $gte: from, $lte: to } }).populate("party", "gstin").lean(),
  ]);
  const m = await sumByAccount({ from, to, accountIds: ids.map(([, id]) => id) });
  const get = (k) => m.get(String(ids.find(([n]) => n === k)[1])) || { debit: 0, credit: 0 };

  // Output tax = credits - debits (credit notes reduce it); ITC = debits - credits
  const out = {}, itc = {};
  for (const t of ["CGST", "SGST", "IGST"]) {
    out[t] = round2(get(`OUT_${t}`).credit - get(`OUT_${t}`).debit);
    itc[t] = round2(get(`IN_${t}`).debit - get(`IN_${t}`).credit);
  }
  const net = Object.fromEntries(["CGST", "SGST", "IGST"].map((t) => [t, round2(out[t] - itc[t])]));

  const byRate = new Map();
  let b2b = 0, b2c = 0;
  for (const inv of invoices) {
    inv.party?.gstin ? (b2b += inv.subTotal) : (b2c += inv.subTotal);
    for (const l of inv.items) {
      const r = byRate.get(l.gstRate) || { rate: l.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      r.taxable += l.amount; r.cgst += l.cgst || 0; r.sgst += l.sgst || 0; r.igst += l.igst || 0;
      byRate.set(l.gstRate, r);
    }
  }
  const rateRows = [...byRate.values()].sort((a, b) => a.rate - b.rate).map((r) => ({ ...r, taxable: round2(r.taxable), cgst: round2(r.cgst), sgst: round2(r.sgst), igst: round2(r.igst) }));

  res.json({
    from, to, outputTax: out, inputTaxCredit: itc, netPayable: net,
    totalOutput: sum(Object.values(out)), totalITC: sum(Object.values(itc)), totalPayable: sum(Object.values(net)),
    outwardByRate: rateRows, b2bTaxable: round2(b2b), b2cTaxable: round2(b2c),
    note: "Figures come from the ledger (credit/debit notes included). Rate-wise table covers tax invoices before notes. Verify against GST portal rules before filing.",
  });
};

// ---------- Stock ----------
const stockReport = async (req, res) => {
  const v = await valuation(parseAsOn(req.query));
  res.json({ asOn: parseAsOn(req.query), rows: v.rows, total: v.total });
};

const stockLedger = async (req, res) => {
  if (!req.query.item) throw httpError(400, "item is required");
  const item = await Item.findById(req.query.item).lean();
  if (!item) throw httpError(404, "Item not found");
  const moves = await StockMovement.find({ item: item._id }).sort({ date: 1, createdAt: 1 }).lean();
  let bal = Number(item.openingStock || 0);
  const rows = [{ date: null, refNo: "Opening", kind: "Opening", in: bal, out: 0, balance: bal }];
  for (const m of moves) {
    bal = round2(bal + (m.direction === "IN" ? m.qty : -m.qty));
    rows.push({ date: m.date, refNo: m.refNo, kind: m.kind, in: m.direction === "IN" ? m.qty : 0, out: m.direction === "OUT" ? m.qty : 0, balance: bal });
  }
  res.json({ item, rows, closing: bal });
};

// ---------- Cash flow (direct method, cash + bank ledgers) ----------
const cashFlow = async (req, res) => {
  const { from, to } = parseRange(req.query);
  const accs = await Account.find({ subGroup: { $in: ["Cash", "Bank"] } }).lean();
  const ids = accs.map((a) => a._id);
  const idSet = new Set(ids.map(String));
  const vouchers = await Voucher.find({ date: { $gte: from, $lte: to }, "lines.account": { $in: ids } }).select("type lines").lean();
  const byType = new Map();
  for (const v of vouchers) {
    const r = byType.get(v.type) || { _id: v.type, inflow: 0, outflow: 0 };
    for (const l of v.lines) if (idSet.has(String(l.account))) { r.inflow += l.debit; r.outflow += l.credit; }
    byType.set(v.type, r);
  }
  const rows = [...byType.values()];
  const before = await sumByAccount({ to: new Date(from.getTime() - 1), accountIds: ids });
  const opening = round2(sum(accs, (a) => a.opening || 0) + [...before.values()].reduce((s, m) => s + m.debit - m.credit, 0));
  const out = rows.map((r) => ({ type: r._id, inflow: round2(r.inflow), outflow: round2(r.outflow), net: round2(r.inflow - r.outflow) })).filter((r) => r.type !== "Contra" || r.net !== 0);
  const totalIn = sum(out, (r) => r.inflow), totalOut = sum(out, (r) => r.outflow);
  res.json({ from, to, opening, rows: out, totalIn, totalOut, closing: round2(opening + totalIn - totalOut) });
};

// ---------- Dashboard ----------
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const monthly = async (ids, from, to) => {
  const set = new Set(ids.map(String));
  const vouchers = await Voucher.find({ date: { $gte: from, $lte: to }, "lines.account": { $in: ids } }).select("date lines").lean();
  const out = MONTHS.map((month) => ({ month, debit: 0, credit: 0 }));
  for (const v of vouchers) {
    const i = (v.date.getUTCMonth() + 9) % 12; // Apr -> 0 ... Mar -> 11
    for (const l of v.lines) if (set.has(String(l.account))) { out[i].debit += l.debit; out[i].credit += l.credit; }
  }
  return out;
};

const dashboard = async (req, res) => {
  const { from, to, fy } = parseRange(req.query);
  const today = endOfDay(toDate());
  const asOn = to < today ? to : today;

  const [bal, pnl, stock, salesIds, purchIds] = await Promise.all([
    closingBalances(asOn), computePnL(from, to), valuation(asOn),
    Promise.all([sys("SALES"), sys("SALES_RETURN")]), Promise.all([sys("PURCHASES"), sys("PURCHASE_RETURN")]),
  ]);

  const group = (sub) => bal.filter((a) => a.subGroup === sub);
  const receivables = sum(group("Sundry Debtors"), (a) => a.balance);
  const payables = sum(group("Sundry Creditors"), (a) => -a.balance);
  const cashBank = sum([...group("Cash"), ...group("Bank")], (a) => a.balance);
  const tax = (p) => sum(bal.filter((a) => a.key?.startsWith(p)), (a) => a.balance);
  const gstPayable = round2(-tax("OUT_") - tax("IN_")); // output is Cr (negative), ITC is Dr (positive)

  const [salesM, purchM] = await Promise.all([monthly(salesIds, from, to), monthly(purchIds, from, to)]);
  const series = MONTHS.map((month, i) => ({ month, sales: round2(salesM[i].credit - salesM[i].debit), purchase: round2(purchM[i].debit - purchM[i].credit) }));

  const recent = await Voucher.find({ reversalOf: { $exists: false } }).populate("party", "name").sort({ date: -1, createdAt: -1 }).limit(8).lean();

  const top = await Invoice.aggregate([
    { $match: { cancelled: { $ne: true }, invoiceDate: { $gte: from, $lte: to } } },
    { $group: { _id: "$party", amount: { $sum: "$subTotal" }, invoices: { $sum: 1 } } }, { $sort: { amount: -1 } }, { $limit: 5 },
  ]);
  const pn = new Map((await Party.find({ _id: { $in: top.map((t) => t._id) } }).select("name").lean()).map((p) => [String(p._id), p.name]));

  const [invCount, partyCount, ageingRes] = await Promise.all([
    Invoice.countDocuments({ cancelled: { $ne: true }, invoiceDate: { $gte: from, $lte: to } }),
    Party.countDocuments(),
    computeAgeing(false, asOn),
  ]);

  res.json({
    fy, from, to, asOn,
    sales: pnl.netSales, receivables, payables, netProfit: pnl.netProfit, cashBank, stockValue: stock.total, gstPayable,
    expenses: pnl.totalExpenses, series, invoiceCount: invCount, partyCount,
    recent: recent.map((v) => ({ _id: v._id, voucherNo: v.voucherNo, type: v.type, date: v.date, party: v.party?.name || "", amount: v.total, status: v.status })),
    topCustomers: top.map((t) => ({ name: pn.get(String(t._id)) || "Unknown", amount: round2(t.amount), invoices: t.invoices })),
    receivableAgeing: ageingRes.totals,
  });
};

const periods = (req, res) => {
  const y = fyStartYear(toDate());
  res.json([y, y - 1, y - 2, y - 3].map((v) => ({ fy: v, label: `FY ${v}-${String(v + 1).slice(2)}` })));
};

module.exports = { profitLoss, trialBalance, balanceSheet, ledger, dayBook, ageing, gstSummary, stockReport, stockLedger, cashFlow, dashboard, periods };
