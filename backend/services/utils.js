// Small shared helpers (money rounding, dates, errors)
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const pad = (n, w = 4) => String(n).padStart(w, "0");

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
};

// All accounting dates are stored as UTC midnight of the calendar day
const toDate = (v) => {
  if (!v) v = todayStr();
  const s = v instanceof Date ? v.toISOString() : String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00.000Z") : new Date(s);
  if (Number.isNaN(d.getTime())) throw httpError(400, `Invalid date: ${v}`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const endOfDay = (d) => new Date(d.getTime() + 86400000 - 1);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Indian financial year: 1 Apr -> 31 Mar. fy = starting year (2026 => FY 2026-27)
const fyStartYear = (d) => (d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1);
const fyRange = (y) => ({ from: new Date(Date.UTC(y, 3, 1)), to: new Date(Date.UTC(y + 1, 3, 1) - 1) });
const parseRange = (q = {}) => {
  if (q.from && q.to) return { from: toDate(q.from), to: endOfDay(toDate(q.to)) };
  const fy = q.fy ? Number(q.fy) : fyStartYear(toDate());
  return { ...fyRange(fy), fy };
};
const parseAsOn = (q = {}) => endOfDay(toDate(q.asOn));

// Ageing bucket by days overdue
const bucketOf = (daysOverdue) =>
  daysOverdue <= 0 ? "current" : daysOverdue <= 30 ? "d30" : daysOverdue <= 60 ? "d60" : daysOverdue <= 90 ? "d90" : "d90plus";

const statusFor = (total, paid, adjusted) => {
  const out = round2(total - paid - adjusted);
  if (out <= 0.005) return "Paid";
  return paid > 0 || adjusted > 0 ? "Partial" : "Pending"; // NOTE: never use "Unpaid" (Dashboard treats it as "paid")
};

module.exports = { round2, httpError, pad, todayStr, toDate, endOfDay, addDays, fyStartYear, fyRange, parseRange, parseAsOn, bucketOf, statusFor };
