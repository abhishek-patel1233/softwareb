import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Navbar";
import { API, s, money, fmtDate, today, errMsg, canWrite, Badge, Field, Msg, useList, PageHead } from "./acc";

export default function Payments() {
  const [payments, reload] = useList("/payments");
  const [parties] = useList("/parties");
  const [accounts] = useList("/accounts");
  const writable = canWrite(["admin", "accountant", "manager"]);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ kind: "Receipt", party: "", amount: "", date: today(), mode: "Bank", account: "", reference: "", narration: "" });
  const [docs, setDocs] = useState([]);
  const [alloc, setAlloc] = useState({});

  const list = parties.filter((p) => p.type === (form.kind === "Receipt" ? "Customer" : "Supplier"));
  const cashBank = accounts.filter((a) => ["Cash", "Bank"].includes(a.subGroup));

  // open invoices / bills of the chosen party
  useEffect(() => {
    setAlloc({});
    if (!form.party) return setDocs([]);
    axios.get(`${API}/payments/outstanding`, { params: { kind: form.kind, party: form.party } }).then((r) => setDocs(r.data)).catch(() => setDocs([]));
  }, [form.party, form.kind]);

  const allocated = Object.values(alloc).reduce((a, v) => a + Number(v || 0), 0);
  const amount = Number(form.amount || 0);

  const autoFill = () => {
    let rem = amount; const next = {};
    for (const d of docs) { if (rem <= 0) break; const a = Math.min(rem, d.outstanding); next[d._id] = Math.round(a * 100) / 100; rem -= a; }
    setAlloc(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    const allocations = Object.entries(alloc).filter(([, v]) => Number(v) > 0).map(([doc, v]) => ({ doc, amount: Number(v) }));
    try {
      await axios.post(`${API}/payments`, { ...form, account: form.account || undefined, amount, allocations, autoAllocate: allocations.length === 0 });
      setMsg({ type: "ok", text: `${form.kind} saved and posted to ledger.` });
      setOpen(false); setForm({ ...form, party: "", amount: "", reference: "", narration: "" }); reload();
    } catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  const cancel = async (p) => {
    const reason = window.prompt(`Cancel ${p.paymentNumber}? Enter reason:`);
    if (reason === null) return;
    try { await axios.post(`${API}/payments/${p._id}/cancel`, { reason }); setMsg({ type: "ok", text: "Cancelled. Invoice/bill balances restored." }); reload(); }
    catch (err) { setMsg({ type: "err", text: errMsg(err) }); }
  };

  return (
    <Sidebar>
      <div style={s.wrap}>
        <PageHead title="Payments & Receipts" sub="Money received from customers / paid to suppliers">
          {writable && <button style={s.btn} onClick={() => setOpen(!open)}>{open ? "Close" : "+ New Voucher"}</button>}
        </PageHead>
        <Msg m={msg} />

        {open && (
          <form onSubmit={submit} style={s.card}>
            <div style={s.grid}>
              <Field label="Type">
                <select style={s.input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, party: "" })}>
                  <option value="Receipt">Receipt (from customer)</option>
                  <option value="Payment">Payment (to supplier)</option>
                </select>
              </Field>
              <Field label="Party *">
                <select required style={s.input} value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
                  <option value="">Select</option>
                  {list.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Amount *"><input required type="number" min="0.01" step="any" style={s.input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Date *"><input required type="date" style={s.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Mode">
                <select style={s.input} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {["Bank", "Cash", "UPI", "Cheque", "NEFT", "RTGS"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Cash/Bank Ledger">
                <select style={s.input} value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
                  <option value="">Auto (by mode)</option>
                  {cashBank.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Reference / UTR"><input style={s.input} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
              <Field label="Narration"><input style={s.input} value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} /></Field>
            </div>

            {docs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>Adjust against open {form.kind === "Receipt" ? "invoices" : "bills"}</strong>
                  <button type="button" style={s.btn2} onClick={autoFill}>Auto (oldest first)</button>
                </div>
                <table style={s.table}>
                  <thead><tr>{["Document", "Date", "Due", "Outstanding", "Allocate"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d._id}>
                        <td style={s.td}>{d.number}</td><td style={s.td}>{fmtDate(d.date)}</td><td style={s.td}>{fmtDate(d.dueDate)}</td>
                        <td style={{ ...s.td, ...s.r }}>{money(d.outstanding)}</td>
                        <td style={{ ...s.td, width: 130 }}><input type="number" min="0" max={d.outstanding} step="any" style={s.input} value={alloc[d._id] ?? ""} onChange={(e) => setAlloc({ ...alloc, [d._id]: e.target.value })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ ...s.sub, marginTop: 6 }}>
                  Allocated {money(allocated)} of {money(amount)}.{" "}
                  {amount > allocated && "Any balance is kept as an advance on the party ledger."}
                  {!Object.keys(alloc).length && " Leave blank to auto-adjust oldest first."}
                </p>
              </div>
            )}
            <div style={{ marginTop: 16 }}><button style={s.btn} type="submit">Save {form.kind}</button></div>
          </form>
        )}

        <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead><tr>{["No.", "Type", "Party", "Date", "Mode", "Against", "Amount", "Status", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan="9" style={{ ...s.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No vouchers yet.</td></tr>}
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.paymentNumber}</td>
                    <td style={s.td}>{p.kind}</td>
                    <td style={s.td}>{p.party?.name}</td>
                    <td style={s.td}>{fmtDate(p.date)}</td>
                    <td style={s.td}>{p.mode}</td>
                    <td style={s.td}>{p.allocations.map((a) => a.docNo).join(", ") || "Advance"}</td>
                    <td style={{ ...s.td, ...s.r, fontWeight: 700 }}>{money(p.amount)}</td>
                    <td style={s.td}><Badge v={p.cancelled ? "Cancelled" : "Posted"} /></td>
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
