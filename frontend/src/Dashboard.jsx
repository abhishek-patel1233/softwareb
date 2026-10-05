import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Sidebar from "./Navbar";
import { API, money, fmtDate, errMsg, useList } from "./acc";


const styles = {
  container: { width: "100%", maxWidth: "1200px", margin: "0 auto", textAlign: "left" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: "24px" },
  title: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" },
  btnGroup: { display: "flex", gap: "10px", flexWrap: "wrap" },
  btnSecondary: { padding: "8px 16px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#334155", textDecoration: "none" },
  btnPrimary: { padding: "8px 16px", backgroundColor: "#4f46e5", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#ffffff", textDecoration: "none" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" },
  card: { backgroundColor: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "500" },
  cardValue: { margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  cardSub: { margin: "2px 0 0 0", fontSize: "11px", fontWeight: "500" },
  cardIcon: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold" },
  gridMain: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "24px" },
  panel: { backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "#f8fafc", padding: "10px 12px", fontSize: "12px", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "12px", fontSize: "13px", color: "#334155", borderBottom: "1px solid #f1f5f9" },
  h3: { margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  p: { margin: "2px 0 16px 0", fontSize: "12px", color: "#64748b" },
  row: { display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "13px" },
};

const Kpi = ({ title, value, sub, color, bg, icon }) => (
  <div style={styles.card}>
    <div>
      <p style={styles.cardTitle}>{title}</p>
      <h3 style={styles.cardValue}>{value}</h3>
      <p style={{ ...styles.cardSub, color }}>{sub}</p>
    </div>
    <div style={{ ...styles.cardIcon, backgroundColor: bg, color }}>{icon}</div>
  </div>
);

export default function Dashboard() {
  const [periods] = useList("/reports/periods");
  const [fy, setFy] = useState("");
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setError("");
    axios
      .get(`${API}/reports/dashboard`, { params: fy ? { fy } : {} })
      .then((r) => live && setD(r.data))
      .catch((e) => live && setError(e.response?.status === 403 ? "Aapke role ko dashboard dekhne ki permission nahi hai." : `Dashboard data load nahi ho pa raha. ${errMsg(e)}`));
    return () => { live = false; };
  }, [fy]);

  const max = Math.max(...(d?.series || []).map((m) => Math.max(m.sales, m.purchase)), 1);
  const ag = d?.receivableAgeing;

  return (
    <Sidebar>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Financial overview{d ? ` · ${fmtDate(d.from)} - ${fmtDate(d.to)}` : ""}</p>
          </div>
          <div style={styles.btnGroup}>
            <select value={fy || d?.fy || ""} onChange={(e) => setFy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
              {periods.map((p) => <option key={p.fy} value={p.fy}>{p.label}</option>)}
            </select>
            <Link to="/parties" style={styles.btnSecondary}>+ Add Party</Link>
            <Link to="/createinvoice" style={styles.btnPrimary}>+ Create Invoice</Link>
          </div>
        </div>

        {error ? (
          <div style={{ ...styles.panel, backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>{error}</div>
        ) : !d ? (
          <div style={{ ...styles.panel, textAlign: "center", color: "#64748b" }}>Loading dashboard data...</div>
        ) : (
          <>
            <div style={styles.grid4}>
              <Kpi title="Sales" value={money(d.sales)} sub={`${d.invoiceCount} invoices`} color="#10b981" bg="#ecfdf5" icon="₹" />
              <Kpi title="Receivables" value={money(d.receivables)} sub="Amount to collect" color="#d97706" bg="#fffbe1" icon="⏳" />
              <Kpi title="Payables" value={money(d.payables)} sub="Amount to pay suppliers" color="#dc2626" bg="#fef2f2" icon="📤" />
              <Kpi title={d.netProfit >= 0 ? "Net Profit" : "Net Loss"} value={money(d.netProfit)} sub="After expenses" color={d.netProfit >= 0 ? "#4f46e5" : "#dc2626"} bg="#e0e7ff" icon="📈" />
              <Kpi title="Cash / Bank" value={money(d.cashBank)} sub="Current balance" color="#2563eb" bg="#eff6ff" icon="🏦" />
              <Kpi title="Stock Value" value={money(d.stockValue)} sub="Weighted average cost" color="#8b5cf6" bg="#f5f3ff" icon="📦" />
              <Kpi title="GST Payable" value={money(d.gstPayable)} sub="Output tax less ITC" color="#0ea5e9" bg="#f0f9ff" icon="🧾" />
              <Kpi title="Expenses" value={money(d.expenses)} sub="Operating expenses" color="#64748b" bg="#f1f5f9" icon="💸" />
            </div>

            <div style={styles.gridMain}>
              <div style={styles.panel}>
                <h3 style={styles.h3}>Sales vs Purchase</h3>
                <p style={styles.p}>
                  <span style={{ color: "#4f46e5" }}>■</span> Sales &nbsp; <span style={{ color: "#f59e0b" }}>■</span> Purchase (net of returns)
                </p>
                <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 6 }}>
                  {d.series.map((m) => (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end", gap: 2, backgroundColor: "#f8fafc", borderRadius: "4px 4px 0 0" }}>
                        <div title={`${m.month} sales: ${money(m.sales)}`} style={{ flex: 1, height: `${Math.max((Math.max(m.sales, 0) / max) * 100, 2)}%`, backgroundColor: "#4f46e5", borderRadius: "3px 3px 0 0" }} />
                        <div title={`${m.month} purchase: ${money(m.purchase)}`} style={{ flex: 1, height: `${Math.max((Math.max(m.purchase, 0) / max) * 100, 2)}%`, backgroundColor: "#f59e0b", borderRadius: "3px 3px 0 0" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#64748b", marginTop: 6, fontWeight: 600 }}>{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.panel}>
                <h3 style={styles.h3}>Receivables Ageing</h3>
                <p style={styles.p}>Customer outstanding by days overdue</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[["Not due", "current", "#10b981"], ["1-30 days", "d30", "#f59e0b"], ["31-60 days", "d60", "#f97316"], ["61-90 days", "d90", "#ef4444"], ["90+ days", "d90plus", "#b91c1c"], ["Opening / advances", "other", "#64748b"]].map(([l, k, c]) => (
                    <div key={k} style={styles.row}><span style={{ color: c, fontWeight: 600 }}>● {l}</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{money(ag?.[k])}</span></div>
                  ))}
                </div>
                <div style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                  <span>Total Parties</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{d.partyCount}</span>
                </div>
              </div>
            </div>

            <div style={styles.gridMain}>
              <div style={{ ...styles.panel, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><h3 style={styles.h3}>Recent Transactions</h3><p style={{ ...styles.p, margin: "2px 0 0" }}>Latest ledger vouchers</p></div>
                  <Link to="/reports" style={{ fontSize: 12, color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>Day Book →</Link>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Voucher</th><th style={styles.th}>Type</th><th style={styles.th}>Party</th><th style={styles.th}>Date</th><th style={{ ...styles.th, textAlign: "right" }}>Amount</th></tr></thead>
                    <tbody>
                      {d.recent.length === 0 ? (
                        <tr><td colSpan="5" style={{ ...styles.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No transactions found.</td></tr>
                      ) : d.recent.map((v) => (
                        <tr key={v._id}>
                          <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{v.voucherNo}</td>
                          <td style={styles.td}>{v.type}</td>
                          <td style={styles.td}>{v.party || "-"}</td>
                          <td style={{ ...styles.td, color: "#64748b" }}>{fmtDate(v.date)}</td>
                          <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{money(v.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.panel}>
                <h3 style={styles.h3}>Top Customers</h3>
                <p style={styles.p}>By sales value this year</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {d.topCustomers.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>No customer sales data available.</p>
                  ) : d.topCustomers.map((c) => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 12 }}>{c.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.invoices} invoice{c.invoices > 1 ? "s" : ""}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{money(c.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
