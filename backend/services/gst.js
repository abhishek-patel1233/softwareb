const { round2, httpError } = require("./utils");

const STATE_CODES = {
  "jammu and kashmir": "01", "himachal pradesh": "02", punjab: "03", chandigarh: "04", uttarakhand: "05",
  haryana: "06", delhi: "07", rajasthan: "08", "uttar pradesh": "09", bihar: "10", sikkim: "11",
  "arunachal pradesh": "12", nagaland: "13", manipur: "14", mizoram: "15", tripura: "16", meghalaya: "17",
  assam: "18", "west bengal": "19", jharkhand: "20", odisha: "21", chhattisgarh: "22", "madhya pradesh": "23",
  gujarat: "24", "dadra and nagar haveli and daman and diu": "26", maharashtra: "27", karnataka: "29", goa: "30",
  lakshadweep: "31", kerala: "32", "tamil nadu": "33", puducherry: "34", "andaman and nicobar islands": "35",
  telangana: "36", "andhra pradesh": "37", ladakh: "38",
};

const stateCodeOf = (party) => {
  const g = String(party?.gstin || "").toUpperCase();
  if (/^\d{2}[A-Z0-9]{13}$/.test(g)) return g.slice(0, 2);
  return STATE_CODES[String(party?.state || "").trim().toLowerCase()] || null;
};

// INTRA = CGST+SGST, INTER = IGST. Unknown party state => treated as intra-state.
const getStateType = (company, party) => {
  const code = stateCodeOf(party);
  return !code || code === company.stateCode ? "INTRA" : "INTER";
};

// Recalculates everything server-side so totals can never be tampered with from the browser.
// discount is per-unit (same as the existing CreateInvoice screen): taxable = (price - discount) * qty
const computeLines = (items, stateType, { noTax = false } = {}) => {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, "At least one item is required");
  let subTotal = 0, cgst = 0, sgst = 0, igst = 0;

  const lines = items.map((it, i) => {
    const quantity = Number(it.quantity), price = Number(it.price), discount = Number(it.discount || 0);
    const gstRate = noTax ? 0 : Number(it.gstRate ?? 0);
    if (!it.name) throw httpError(400, `Row ${i + 1}: item name missing`);
    if (!(quantity > 0)) throw httpError(400, `Row ${i + 1}: quantity must be greater than 0`);
    if (!(price >= 0) || !(discount >= 0)) throw httpError(400, `Row ${i + 1}: invalid price/discount`);
    if (!(gstRate >= 0 && gstRate <= 100)) throw httpError(400, `Row ${i + 1}: invalid GST rate`);

    const amount = round2(Math.max(0, price - discount) * quantity);
    const tax = round2((amount * gstRate) / 100);
    let c = 0, s = 0, g = 0;
    if (stateType === "INTRA") { c = round2(tax / 2); s = round2(tax - c); } else { g = tax; }
    subTotal += amount; cgst += c; sgst += s; igst += g;

    return { item: it.item || it.itemId, name: it.name, hsnCode: it.hsnCode, quantity, price, discount, gstRate, amount, cgst: c, sgst: s, igst: g };
  });

  subTotal = round2(subTotal); cgst = round2(cgst); sgst = round2(sgst); igst = round2(igst);
  const gstAmount = round2(cgst + sgst + igst);
  return { lines, subTotal, cgst, sgst, igst, gstAmount, grandTotal: round2(subTotal + gstAmount) };
};

module.exports = { STATE_CODES, stateCodeOf, getStateType, computeLines };
