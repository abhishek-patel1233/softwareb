import { useState } from "react";
import axios from "axios";
import Sidebar from "./Navbar";
import { API, s, money, fmtDate, today, errMsg, canWrite, Badge, Field, Msg, useList, ItemGrid, emptyRow, PageHead } from "./acc";

export default function Purchases() {
  const [purchases, reload] = useList("/purchases");
  const [parties] = useList("/parties");
  const [items] = useList("/items");
  const suppliers = parties.filter((p) => p.type === "Supplier");
  const writable = canWrite(["admin", "accountant", "manager", "purchase"]);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ party: "", billNumber: "", billDate: today(), dueDate: "", notes: "" });
  const [rows, setRows] = useState([emptyRow()]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/purchases`, { ...form, dueDate: form.dueDate || undefined, items: rows });
      setMsg({ type: "ok", text: "Purchase bill saved and posted to ledger." });
      setOpen(false); setRows([emptyRow()]); setForm({ party: "", billNumber: "", billDate: today(), dueDate: "", notes: "" });
      reload();
    } catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  const cancel = async (p) => {
    const reason = window.prompt(`Cancel ${p.purchaseNumber}? Enter reason:`);
    if (reason === null) return;
    try { await axios.post(`${API}/purchases/${p._id}/cancel`, { reason }); setMsg({ type: "ok", text: "Purchase cancelled." }); reload(); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  return (
    <Sidebar>
      <div style={s.wrap}>
        <PageHead title="Purchases" sub="Supplier bills - input GST (ITC), payables and stock-in">
          {writable && <button style={s.btn} onClick={() => setOpen(!open)}>{open ? "Close" : "+ New Purchase Bill"}</button>}
        </PageHead>
        <Msg m={msg} />

        {open && (
          <form onSubmit={submit} style={s.card}>
            <div style={s.grid}>
              <Field label="Supplier *">
                <select required style={s.input} value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
                  <option value="">Select supplier</option>
                  {suppliers.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Supplier Bill No. *"><input required style={s.input} value={form.billNumber} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} /></Field>
              <Field label="Bill Date *"><input type="date" required style={s.input} value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} /></Field>
              <Field label="Due Date"><input type="date" style={s.input} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            </div>
            <div style={{ margin: "16px 0" }}><ItemGrid rows={rows} setRows={setRows} items={items} priceField="purchasePrice" /></div>
            <Field label="Notes"><input style={s.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <p style={{ ...s.sub, margin: "10px 0" }}>GST split (CGST+SGST / IGST) is decided automatically from your state and the supplier's GSTIN/state.</p>
            <button style={s.btn} type="submit">Save Purchase Bill</button>
          </form>
        )}

        <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead><tr>{["No.", "Supplier Bill", "Supplier", "Date", "Due", "Status", "Total", "Outstanding", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {purchases.length === 0 && <tr><td colSpan="9" style={{ ...s.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No purchase bills yet.</td></tr>}
                {purchases.map((p) => (
                  <tr key={p._id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.purchaseNumber}</td>
                    <td style={s.td}>{p.billNumber}</td>
                    <td style={s.td}>{p.party?.name}</td>
                    <td style={s.td}>{fmtDate(p.billDate)}</td>
                    <td style={s.td}>{fmtDate(p.dueDate)}</td>
                    <td style={s.td}><Badge v={p.status} /></td>
                    <td style={{ ...s.td, ...s.r, fontWeight: 700 }}>{money(p.grandTotal)}</td>
                    <td style={{ ...s.td, ...s.r }}>{money(p.outstanding)}</td>
                    <td style={s.td}>{writable && !p.cancelled && <button style={s.btnDanger} onClick={() => cancel(p)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
