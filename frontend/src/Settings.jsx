import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Navbar";
import { API, s, money, fmtDate, today, errMsg, canWrite, getUser, Field, Msg, useList, PageHead } from "./acc";

const TABS = [["company", "Company & Period Lock"], ["accounts", "Chart of Accounts"], ["journal", "Journal / Contra"], ["audit", "Audit Trail"]];

export default function Settings() {
  const [tab, setTab] = useState("company");
  const [msg, setMsg] = useState(null);
  const user = getUser();

  return (
    <Sidebar>
      <div style={s.wrap}>
        <PageHead title="Settings" sub={`Logged in as ${user.name || "-"} (${user.role || "-"})`} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setMsg(null); }} style={{ ...s.btn2, ...(tab === k && { background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" }) }}>{l}</button>)}
        </div>
        <Msg m={msg} />
        {tab === "company" && <Company setMsg={setMsg} />}
        {tab === "accounts" && <Accounts setMsg={setMsg} />}
        {tab === "journal" && <Journal setMsg={setMsg} />}
        {tab === "audit" && <Audit />}
      </div>
    </Sidebar>
  );
}

function Company({ setMsg }) {
  const [f, setF] = useState(null);
  const admin = canWrite(["admin"]);
  useEffect(() => { axios.get(`${API}/settings`).then((r) => setF({ ...r.data, lockedUpto: r.data.lockedUpto ? r.data.lockedUpto.slice(0, 10) : "" })).catch(() => {}); }, []);
  if (!f) return <div style={s.sub}>Loading...</div>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { const r = await axios.put(`${API}/settings`, f); setF({ ...r.data, lockedUpto: r.data.lockedUpto ? r.data.lockedUpto.slice(0, 10) : "" }); setMsg({ type: "ok", text: `Saved. Seller state code: ${r.data.stateCode}` }); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };
  const inp = (k, label, type = "text") => <Field label={label}><input type={type} disabled={!admin} style={s.input} value={f[k] ?? ""} onChange={set(k)} /></Field>;
  return (
    <form onSubmit={save} style={s.card}>
      <div style={s.grid}>
        {inp("name", "Company name")}{inp("gstin", "GSTIN")}{inp("state", "State")}{inp("address", "Address")}{inp("phone", "Phone")}{inp("email", "Email")}
        {inp("bankName", "Bank name")}{inp("bankAccount", "Account no.")}{inp("ifsc", "IFSC")}{inp("upi", "UPI ID")}{inp("creditDays", "Default credit days", "number")}
        <Field label="Lock books up to (no posting on/before)"><input type="date" disabled={!admin} style={s.input} value={f.lockedUpto} onChange={set("lockedUpto")} /></Field>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 14 }}>
        <input type="checkbox" disabled={!admin} checked={!!f.allowNegativeStock} onChange={set("allowNegativeStock")} /> Allow selling more than available stock
      </label>
      <p style={s.sub}>State code is read from GSTIN (first 2 digits) or the state name and decides CGST+SGST vs IGST on every document.</p>
      {admin ? <button style={s.btn} type="submit">Save settings</button> : <p style={s.sub}>Only an admin can change settings.</p>}
    </form>
  );
}

function Accounts({ setMsg }) {
  const [rows, reload] = useList("/accounts", { balances: 1 });
  const [f, setF] = useState({ name: "", group: "Expense", subGroup: "", openingBalance: "", openingType: "Dr" });
  const writable = canWrite(["admin", "accountant"]);
  const add = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/accounts`, f); setMsg({ type: "ok", text: "Ledger created." }); setF({ ...f, name: "", openingBalance: "" }); reload(); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };
  return (
    <>
      {writable && (
        <form onSubmit={add} style={s.card}>
          <div style={s.grid}>
            <Field label="Ledger name *"><input required style={s.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Group"><select style={s.input} value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}>{["Asset", "Liability", "Income", "Expense", "Equity"].map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label="Sub-group (e.g. Bank, Cash, Indirect Expenses)"><input style={s.input} value={f.subGroup} onChange={(e) => setF({ ...f, subGroup: e.target.value })} /></Field>
            <Field label="Opening balance"><input type="number" step="any" style={s.input} value={f.openingBalance} onChange={(e) => setF({ ...f, openingBalance: e.target.value })} /></Field>
            <Field label="Dr / Cr"><select style={s.input} value={f.openingType} onChange={(e) => setF({ ...f, openingType: e.target.value })}><option>Dr</option><option>Cr</option></select></Field>
          </div>
          <div style={{ marginTop: 12 }}><button style={s.btn} type="submit">Add ledger</button></div>
        </form>
      )}
      <div style={{ ...s.card, padding: 0, overflow: "auto" }}>
        <table style={s.table}>
          <thead><tr>{["Ledger", "Group", "Sub-group", "Balance"].map((h, i) => <th key={h} style={{ ...s.th, ...(i === 3 && s.r) }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((a) => <tr key={a._id}><td style={s.td}>{a.name}</td><td style={s.td}>{a.group}</td><td style={s.td}>{a.subGroup}</td><td style={{ ...s.td, ...s.r }}>{money(Math.abs(a.balance))} {a.balance < 0 ? "Cr" : a.balance > 0 ? "Dr" : ""}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function Journal({ setMsg }) {
  const [accounts] = useList("/accounts");
  const [vouchers, reload] = useList("/vouchers", { limit: 30 });
  const writable = canWrite(["admin", "accountant"]);
  const [type, setType] = useState("Journal");
  const [date, setDate] = useState(today());
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }]);
  const dr = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
  const cr = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
  const pool = type === "Contra" ? accounts.filter((a) => ["Cash", "Bank"].includes(a.subGroup)) : accounts;
  const setL = (i, p) => setLines(lines.map((l, x) => (x === i ? { ...l, ...p } : l)));

  const save = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vouchers`, { type, date, narration, lines: lines.map((l) => ({ account: l.account, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })) });
      setMsg({ type: "ok", text: `${type} voucher posted.` }); setLines([{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }]); setNarration(""); reload();
    } catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };
  const reverse = async (v) => {
    const reason = window.prompt(`Reverse ${v.voucherNo}? Enter reason:`);
    if (reason === null) return;
    try { await axios.post(`${API}/vouchers/${v._id}/reverse`, { reason }); setMsg({ type: "ok", text: "Reversal posted." }); reload(); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  return (
    <>
      {writable && (
        <form onSubmit={save} style={s.card}>
          <div style={s.grid}>
            <Field label="Voucher type"><select style={s.input} value={type} onChange={(e) => setType(e.target.value)}><option value="Journal">Journal (adjustment)</option><option value="Contra">Contra (cash ⇄ bank)</option></select></Field>
            <Field label="Date"><input type="date" required style={s.input} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Narration"><input style={s.input} value={narration} onChange={(e) => setNarration(e.target.value)} /></Field>
          </div>
          <table style={{ ...s.table, marginTop: 12 }}>
            <thead><tr><th style={s.th}>Account</th><th style={s.th}>Debit</th><th style={s.th}>Credit</th></tr></thead>
            <tbody>{lines.map((l, i) => (
              <tr key={i}>
                <td style={s.td}><select required style={s.input} value={l.account} onChange={(e) => setL(i, { account: e.target.value })}><option value="">Select</option>{pool.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}</select></td>
                <td style={{ ...s.td, width: 150 }}><input type="number" min="0" step="any" style={s.input} value={l.debit} onChange={(e) => setL(i, { debit: e.target.value, credit: "" })} /></td>
                <td style={{ ...s.td, width: 150 }}><input type="number" min="0" step="any" style={s.input} value={l.credit} onChange={(e) => setL(i, { credit: e.target.value, debit: "" })} /></td>
              </tr>))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
            <button type="button" style={s.btn2} onClick={() => setLines([...lines, { account: "", debit: "", credit: "" }])}>+ Add line</button>
            <span style={{ fontSize: 13, color: Math.abs(dr - cr) < 0.005 && dr > 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>Dr {money(dr)} | Cr {money(cr)} {Math.abs(dr - cr) < 0.005 && dr > 0 ? "✓ balanced" : "✗ not balanced"}</span>
          </div>
          <div style={{ marginTop: 12 }}><button style={s.btn} type="submit" disabled={Math.abs(dr - cr) > 0.005 || dr === 0}>Post voucher</button></div>
        </form>
      )}
      <div style={{ ...s.card, padding: 0, overflow: "auto" }}>
        <table style={s.table}>
          <thead><tr>{["Voucher", "Type", "Date", "Narration", "Amount", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{vouchers.map((v) => (
            <tr key={v._id}><td style={s.td}>{v.voucherNo}</td><td style={s.td}>{v.type}</td><td style={s.td}>{fmtDate(v.date)}</td><td style={s.td}>{v.narration}</td><td style={{ ...s.td, ...s.r }}>{money(v.total)}</td>
              <td style={s.td}>{writable && !v.refModel && !v.reversalOf && v.status === "Posted" && <button style={s.btnDanger} onClick={() => reverse(v)}>Reverse</button>}</td></tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Audit() {
  const [rows] = useList("/audit", { limit: 200 });
  return (
    <div style={{ ...s.card, padding: 0, overflow: "auto" }}>
      <table style={s.table}>
        <thead><tr>{["When", "User", "Action", "Entity", "Document", "Details"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="6" style={{ ...s.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No audit entries (or your role cannot view them).</td></tr>}
          {rows.map((r) => (
            <tr key={r._id}><td style={s.td}>{new Date(r.createdAt).toLocaleString("en-IN")}</td><td style={s.td}>{r.userName} <span style={{ color: "#94a3b8" }}>({r.role})</span></td><td style={s.td}>{r.action}</td><td style={s.td}>{r.entity}</td><td style={s.td}>{r.docNo}</td>
              <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{r.details ? JSON.stringify(r.details) : ""}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
