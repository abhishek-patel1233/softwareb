// Inventory: stock movements + weighted-average valuation (as on any date)
const Item = require("../models/Item");
const StockMovement = require("../models/StockMovement");
const { round2 } = require("./utils");

const isService = (item) => item.itemType === "Service" || String(item.hsnCode || "").startsWith("99");

// lines: computed lines ({item, quantity, price, discount}); only goods are stocked
const recordStock = async (lines, { date, direction, kind, useRate = false, refModel, refId, refNo }) => {
  const ids = lines.map((l) => l.item).filter(Boolean);
  const items = await Item.find({ _id: { $in: ids } }).select("itemType hsnCode").lean();
  const goods = new Set(items.filter((i) => !isService(i)).map((i) => String(i._id)));

  const docs = lines
    .filter((l) => l.item && goods.has(String(l.item)))
    .map((l) => ({
      item: l.item, date, direction, kind, qty: l.quantity,
      rate: useRate ? round2(Math.max(0, Number(l.price) - Number(l.discount || 0))) : null,
      refModel, refId, refNo,
    }));
  if (docs.length) await StockMovement.insertMany(docs);
};

// Undo every movement of a document (cancel). OUT -> IN at average, IN -> OUT.
const reverseStock = async (refId, { date, refNo }) => {
  const moves = await StockMovement.find({ refId }).lean();
  if (!moves.length) return;
  await StockMovement.insertMany(
    moves.map((m) => ({
      item: m.item, date, qty: m.qty, kind: "Reversal", refModel: m.refModel, refId: m.refId, refNo,
      direction: m.direction === "IN" ? "OUT" : "IN", rate: null,
    }))
  );
};

// Quantity on hand per item (opening + IN - OUT), used for the optional negative-stock check
const stockQty = async (itemIds, asOn) => {
  const [items, agg] = await Promise.all([
    Item.find({ _id: { $in: itemIds } }).select("openingStock").lean(),
    StockMovement.aggregate([
      { $match: { item: { $in: itemIds }, ...(asOn && { date: { $lte: asOn } }) } },
      { $group: { _id: { item: "$item", d: "$direction" }, qty: { $sum: "$qty" } } },
    ]),
  ]);
  const out = new Map(items.map((i) => [String(i._id), Number(i.openingStock || 0)]));
  for (const r of agg) {
    const k = String(r._id.item);
    out.set(k, (out.get(k) || 0) + (r._id.d === "IN" ? r.qty : -r.qty));
  }
  return out;
};

// Pure valuation of one item's history (exported for testing)
const valueItem = (openingQty, openingRate, moves) => {
  let qty = Number(openingQty || 0), value = qty * Number(openingRate || 0), lastAvg = Number(openingRate || 0);
  const avg = () => (qty > 0 ? value / qty : lastAvg);
  for (const m of moves) {
    if (qty > 0) lastAvg = value / qty;
    if (m.direction === "IN") {
      const r = m.rate ?? avg();
      value += m.qty * r;
      qty += m.qty;
    } else {
      value -= m.qty * avg();
      qty -= m.qty;
    }
    if (Math.abs(qty) < 1e-9) { qty = 0; value = 0; }
  }
  return { qty: round2(qty), avgCost: round2(qty > 0 ? value / qty : lastAvg), value: round2(value) };
};

// Stock value of every item as on a date (opening stock counts from the very beginning)
const valuation = async (asOn) => {
  const [items, moves] = await Promise.all([
    Item.find({}).lean(),
    StockMovement.find({ date: { $lte: asOn } }).sort({ date: 1, createdAt: 1 }).lean(),
  ]);
  const byItem = new Map();
  for (const m of moves) {
    const k = String(m.item);
    if (!byItem.has(k)) byItem.set(k, []);
    byItem.get(k).push(m);
  }
  const rows = items
    .filter((i) => !isService(i))
    .map((i) => ({
      item: i._id, name: i.name, hsnCode: i.hsnCode, unit: i.unit,
      ...valueItem(i.openingStock, i.purchasePrice, byItem.get(String(i._id)) || []),
    }));
  return { rows, total: round2(rows.reduce((s, r) => s + r.value, 0)) };
};

module.exports = { isService, recordStock, reverseStock, stockQty, valueItem, valuation };
