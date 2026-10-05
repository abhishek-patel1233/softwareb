
import { useEffect, useState } from "react";
import axios from "axios";

export const API = "http://localhost:5000/api";
export const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const num = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "-");
export const today = () => new Date().toISOString().slice(0, 10);
export const errMsg = (e) => e?.response?.data?.message || e?.message || "Something went wrong";
export const getUser = () => { try { return JSON.parse(localStorage.getItem("userInfo")) || {}; } catch { return {}; } };
export const canWrite = (roles) => roles.includes(getUser().role);

export const s = {
  wrap: { width: "100%", maxWidth: 1200, margin: "0 auto", textAlign: "left" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  h1: { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" },
  sub: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  card: { background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, background: "#fff", boxSizing: "border-box" },
  btn: { padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btn2: { padding: "8px 16px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger: { padding: "4px 10px", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { background: "#f8fafc", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9" },
  r: { textAlign: "right" },
};

const BADGE = { Paid: ["#ecfdf5", "#059669"], Partial: ["#eff6ff", "#2563eb"], Pending: ["#fffbe1", "#d97706"], Cancelled: ["#fef2f2", "#dc2626"], Posted: ["#ecfdf5", "#059669"], Reversed: ["#fef2f2", "#dc2626"], Reversal: ["#f1f5f9", "#64748b"] };
export const Badge = ({ v }) => {
  const [bg, fg] = BADGE[v] || ["#f1f5f9", "#475569"];
  return <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: bg, color: fg }}>{v}</span>;
};

export const Field = ({ label, children }) => (
  <div><label style={s.label}>{label}</label>{children}</div>
);

export const Msg = ({ m }) =>
  m ? <div style={{ ...s.card, padding: 12, background: m.type === "err" ? "#fef2f2" : "#ecfdf5", color: m.type === "err" ? "#dc2626" : "#059669", borderColor: m.type === "err" ? "#fecaca" : "#a7f3d0", fontSize: 13 }}>{m.text}</div> : null;

// loads a list from the API and exposes reload()
export function useList(path, params) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params || {});
  const reload = async () => {
    try { setData((await axios.get(`${API}${path}`, { params })).data); } catch { setData([]); }
    setLoading(false);
  };
  useEffect(() => { reload(); }, [path, key]);
  return [data, reload, loading];
}

// Editable invoice-style item grid shared by Purchases and Notes
export const emptyRow = () => ({ item: "", name: "", hsnCode: "", quantity: 1, price: 0, discount: 0, gstRate: 18 });
export function ItemGrid({ rows, setRows, items, priceField = "purchasePrice", lockItems = false }) {
  const set = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const pick = (i, id) => {
    const it = items.find((x) => x._id === id);
    set(i, it ? { item: it._id, name: it.name, hsnCode: it.hsnCode, price: it[priceField] || 0, gstRate: it.gstRate } : { item: "", name: "" });
  };
  const calc = (r) => Math.max(0, r.price - r.discount) * r.quantity * (1 + r.gstRate / 100);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={s.table}>
        <thead><tr>{["Item", "Qty", "Rate", "Disc/unit", "GST %", "Total", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...s.td, minWidth: 200 }}>
                {lockItems ? r.name : (
                  <select style={s.input} value={r.item} onChange={(e) => pick(i, e.target.value)}>
                    <option value="">Select item</option>
                    {items.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
                  </select>
                )}
              </td>
              {["quantity", "price", "discount", "gstRate"].map((f) => (
                <td key={f} style={{ ...s.td, width: 100 }}>
                  <input type="number" min="0" step="any" style={s.input} value={r[f]} onChange={(e) => set(i, { [f]: Number(e.target.value) })} />
                </td>
              ))}
              <td style={{ ...s.td, ...s.r, fontWeight: 600 }}>{money(calc(r))}</td>
              <td style={s.td}>{!lockItems && rows.length > 1 && <button type="button" style={s.btnDanger} onClick={() => setRows(rows.filter((_, x) => x !== i))}>✕</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!lockItems && <button type="button" style={{ ...s.btn2, marginTop: 10 }} onClick={() => setRows([...rows, emptyRow()])}>+ Add row</button>}
      <div style={{ ...s.r, marginTop: 10, fontSize: 14, fontWeight: 700 }}>Approx. total: {money(rows.reduce((a, r) => a + calc(r), 0))}</div>
    </div>
  );
}

export const PageHead = ({ title, sub, children }) => (
  <div style={s.head}><div><h1 style={s.h1}>{title}</h1>{sub && <p style={s.sub}>{sub}</p>}</div><div style={{ display: "flex", gap: 10 }}>{children}</div></div>
);
