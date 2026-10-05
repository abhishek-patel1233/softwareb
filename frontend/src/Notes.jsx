import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Navbar";
import { API, s, money, fmtDate, today, errMsg, canWrite, Badge, Field, Msg, useList, ItemGrid, PageHead } from "./acc";

export default function Notes() {
  const [notes, reload] = useList("/notes");
  const [invoices] = useList("/invoices");
  const [purchases] = useList("/purchases");
  const writable = canWrite(["admin", "accountant", "manager"]);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ kind: "Credit", againstModel: "Invoice", against: "", date: today(), reason: "Sales Return", returnStock: false });
  const [rows, setRows] = useState([]);

  const docs = (form.againstModel === "Invoice" ? invoices : purchases).filter((d) => !d.cancelled);
  const doc = docs.find((d) => d._id === form.against);

  // start from the original document's lines; user edits qty/rate to the returned/adjusted values
  useEffect(() => {
    setRows(doc ? doc.items.map((i) => ({ item: i.item, name: i.name, hsnCode: i.hsnCode, quantity: i.quantity, price: i.price, discount: i.discount || 0, gstRate: i.gstRate })) : []);
    // eslint-disable-next-line
  }, [form.against]);

  const reduces = (form.againstModel === "Invoice") === (form.kind === "Credit");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/notes`, { ...form, items: rows.filter((r) => r.quantity > 0) });
      setMsg({ type: "ok", text: `${form.kind} note saved and posted.` });
      setOpen(false); setForm({ ...form, against: "" }); reload();
    } catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  const cancel = async (n) => {
    const reason = window.prompt(`Cancel ${n.noteNumber}? Enter reason:`);
    if (reason === null) return;
    try { await axios.post(`${API}/notes/${n._id}/cancel`, { reason }); setMsg({ type: "ok", text: "Note cancelled." }); reload(); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  return (
    <Sidebar>
      <div style={s.wrap}>
        <PageHead title="Credit & Debit Notes" sub="Adjust an earlier invoice / purchase bill (returns, discounts, extra charges)">
          {writable && <button style={s.btn} onClick={() => setOpen(!open)}>{open ? "Close" : "+ New Note"}</button>}
        </PageHead>
        <Msg m={msg} />

        {open && (
          <form onSubmit={submit} style={s.card}>
            <div style={s.grid}>
              <Field label="Note type">
                <select style={s.input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="Credit">Credit Note</option><option value="Debit">Debit Note</option>
                </select>
              </Field>
              <Field label="Against">
                <select style={s.input} value={form.againstModel} onChange={(e) => setForm({ ...form, againstModel: e.target.value, against: "" })}>
                  <option value="Invoice">Sales Invoice</option><option value="Purchase">Purchase Bill</option>
                </select>
              </Field>
              <Field label="Original document *">
                <select required style={s.input} value={form.against} onChange={(e) => setForm({ ...form, against: e.target.value })}>
                  <option value="">Select</option>
                  {docs.map((d) => <option key={d._id} value={d._id}>{d.invoiceNumber || d.purchaseNumber} - {d.party?.name} - {money(d.grandTotal)}</option>)}
                </select>
              </Field>
              <Field label="Date *"><input type="date" required style={s.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Reason">
                <select style={s.input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                  {["Sales Return", "Purchase Return", "Discount", "Price Correction", "Additional Charges", "Other"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {doc && (
              <div style={{ marginTop: 16 }}>
                <p style={s.sub}>Edit quantity / rate to the value being {reduces ? "credited back" : "added"}. Set quantity to 0 to leave a line out.</p>
                <ItemGrid rows={rows} setRows={setRows} items={[]} lockItems />
                {reduces && (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 10 }}>
                    <input type="checkbox" checked={form.returnStock} onChange={(e) => setForm({ ...form, returnStock: e.target.checked })} />
                    Goods physically returned - adjust stock {form.againstModel === "Invoice" ? "(add back)" : "(remove)"}
                  </label>
                )}
              </div>
            )}
            <div style={{ marginTop: 16 }}><button style={s.btn} type="submit" disabled={!doc}>Save {form.kind} Note</button></div>
          </form>
        )}

        <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead><tr>{["Note", "Type", "Against", "Party", "Date", "Reason", "Amount", "Status", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {notes.length === 0 && <tr><td colSpan="9" style={{ ...s.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No notes yet.</td></tr>}
                {notes.map((n) => (
                  <tr key={n._id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{n.noteNumber}</td>
                    <td style={s.td}>{n.kind}</td><td style={s.td}>{n.againstNo}</td><td style={s.td}>{n.party?.name}</td>
                    <td style={s.td}>{fmtDate(n.date)}</td><td style={s.td}>{n.reason}</td>
                    <td style={{ ...s.td, ...s.r, fontWeight: 700 }}>{money(n.grandTotal)}</td>
                    <td style={s.td}><Badge v={n.cancelled ? "Cancelled" : "Posted"} /></td>
                    <td style={s.td}>{writable && !n.cancelled && <button style={s.btnDanger} onClick={() => cancel(n)}>Cancel</button>}</td>
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
