import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Navbar";
import { API, s, money, num, fmtDate, today, errMsg, Field, useList, PageHead } from "./acc";

const TABS = [
  ["pl", "Profit & Loss"], ["bs", "Balance Sheet"], ["tb", "Trial Balance"], ["ledger", "Ledger"], ["day", "Day Book"],
  ["rec", "Receivable Ageing"], ["pay", "Payable Ageing"], ["gst", "GST Summary"], ["stock", "Stock"], ["cash", "Cash Flow"],
];
const NEEDS_RANGE = ["pl", "ledger", "day", "gst", "cash"];
const NEEDS_ASON = ["bs", "tb", "rec", "pay", "stock"];

const Th = ({ children, right }) => <th style={{ ...s.th, ...(right && s.r) }}>{children}</th>;
const Td = ({ children, right, bold }) => <td style={{ ...s.td, ...(right && s.r), ...(bold && { fontWeight: 700 }) }}>{children}</td>;
const Empty = ({ cols }) => <tr><td colSpan={cols} style={{ ...s.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>No data for this period.</td></tr>;

// Two-column statement used by P&L and Balance Sheet
function Statement({ sections }) {
  return sections.map((sec) => (
    <div key={sec.title} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", background: "#f8fafc", padding: "8px 12px", borderRadius: 6 }}>{sec.title}</div>
      {sec.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}><span>{r.label}</span><span>{money(r.amount)}</span></div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontSize: 13, fontWeight: 700 }}><span>{sec.total.label}</span><span>{money(sec.total.amount)}</span></div>
    </div>
  ));
}

export default function Reports() {
  const [tab, setTab] = useState("pl");
  const [periods] = useList("/reports/periods");
  const [accounts] = useList("/accounts");
  const [items] = useList("/items");
  const [fy, setFy] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [asOn, setAsOn] = useState(today());
  const [account, setAccount] = useState("");
  const [item, setItem] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { if (periods.length && !fy) setFy(String(periods[0].fy)); }, [periods, fy]);

  useEffect(() => {
    if (!fy) return;
    const range = from && to ? { from, to } : { fy };
    const map = {
      pl: ["/reports/profit-loss", range], bs: ["/reports/balance-sheet", { asOn }], tb: ["/reports/trial-balance", { asOn }],
      ledger: ["/reports/ledger", { ...range, account }], day: ["/reports/day-book", range],
      rec: ["/reports/ageing", { kind: "receivable", asOn }], pay: ["/reports/ageing", { kind: "payable", asOn }],
      gst: ["/reports/gst", range], stock: ["/reports/stock", { asOn }], cash: ["/reports/cash-flow", range],
    };
    const [url, params] = map[tab];
    if (tab === "ledger" && !account) { setData(null); return; }
    setData(null); setErr("");
    axios.get(`${API}${url}`, { params }).then((r) => setData(r.data)).catch((e) => setErr(errMsg(e)));
  }, [tab, fy, from, to, asOn, account]);

  const csv = () => {
    const rows = document.querySelectorAll("#report-area tr");
    const text = [...rows].map((tr) => [...tr.children].map((c) => `"${c.innerText.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `${tab}-report.csv`; a.click();
  };

  const renderBody = () => {
    if (err) return <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>;
    if (tab === "ledger" && !account) return <div style={s.sub}>Select an account to see its ledger.</div>;
    if (!data) return <div style={s.sub}>Loading...</div>;

    if (tab === "pl") return <Statement sections={data.sections} />;

    if (tab === "bs") return (
      <div style={s.grid}>
        <div><h4 style={{ margin: "0 0 8px" }}>Liabilities & Equity</h4><Statement sections={data.liabilities} /><b style={{ fontSize: 13 }}>Total: {money(data.totalLiabilities)}</b></div>
        <div><h4 style={{ margin: "0 0 8px" }}>Assets</h4><Statement sections={data.assets} /><b style={{ fontSize: 13 }}>Total: {money(data.totalAssets)}</b></div>
        {Math.abs(data.difference) > 0.01 && <div style={{ gridColumn: "1/-1", color: "#dc2626", fontSize: 13 }}>Difference: {money(data.difference)}</div>}
      </div>
    );

    if (tab === "tb") return (
      <table style={s.table}><thead><tr><Th>Account</Th><Th>Group</Th><Th right>Debit</Th><Th right>Credit</Th></tr></thead>
        <tbody>
          {data.rows.length === 0 && <Empty cols={4} />}
          {data.rows.map((r, i) => <tr key={i}><Td>{r.name}</Td><Td>{r.group}</Td><Td right>{r.debit ? num(r.debit) : ""}</Td><Td right>{r.credit ? num(r.credit) : ""}</Td></tr>)}
          <tr><Td bold>Total</Td><Td /><Td right bold>{num(data.totals.debit)}</Td><Td right bold>{num(data.totals.credit)}</Td></tr>
        </tbody></table>
    );

    if (tab === "ledger") return (
      <table style={s.table}><thead><tr><Th>Date</Th><Th>Voucher</Th><Th>Particulars</Th><Th right>Debit</Th><Th right>Credit</Th><Th right>Balance (Dr+/Cr-)</Th></tr></thead>
        <tbody>
          <tr><Td /><Td /><Td bold>Opening Balance</Td><Td /><Td /><Td right bold>{num(data.opening)}</Td></tr>
          {data.rows.map((r, i) => <tr key={i}><Td>{fmtDate(r.date)}</Td><Td>{r.voucherNo}</Td><Td>{r.particulars}</Td><Td right>{r.debit ? num(r.debit) : ""}</Td><Td right>{r.credit ? num(r.credit) : ""}</Td><Td right>{num(r.balance)}</Td></tr>)}
          <tr><Td /><Td /><Td bold>Closing Balance</Td><Td right bold>{num(data.totals.debit)}</Td><Td right bold>{num(data.totals.credit)}</Td><Td right bold>{num(data.closing)}</Td></tr>
        </tbody></table>
    );

    if (tab === "day") return (
      <table style={s.table}><thead><tr><Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>Party</Th><Th>Narration</Th><Th right>Amount</Th></tr></thead>
        <tbody>
          {data.rows.length === 0 && <Empty cols={6} />}
          {data.rows.map((r, i) => <tr key={i}><Td>{fmtDate(r.date)}</Td><Td>{r.voucherNo}</Td><Td>{r.type}{r.status !== "Posted" ? ` (${r.status})` : ""}</Td><Td>{r.party}</Td><Td>{r.narration}</Td><Td right>{num(r.amount)}</Td></tr>)}
        </tbody></table>
    );

    if (tab === "rec" || tab === "pay") return (
      <table style={s.table}><thead><tr><Th>{tab === "rec" ? "Customer" : "Supplier"}</Th><Th right>Not due</Th><Th right>1-30</Th><Th right>31-60</Th><Th right>61-90</Th><Th right>90+</Th><Th right>Opening/Advance</Th><Th right>Total</Th></tr></thead>
        <tbody>
          {data.rows.length === 0 && <Empty cols={8} />}
          {data.rows.map((r, i) => <tr key={i}><Td>{r.party}</Td>{["current", "d30", "d60", "d90", "d90plus", "other"].map((k) => <Td key={k} right>{r[k] ? num(r[k]) : ""}</Td>)}<Td right bold>{num(r.total)}</Td></tr>)}
          <tr><Td bold>Total</Td>{["current", "d30", "d60", "d90", "d90plus", "other", "total"].map((k) => <Td key={k} right bold>{num(data.totals[k])}</Td>)}</tr>
        </tbody></table>
    );

    if (tab === "gst") return (
      <div>
        <table style={s.table}><thead><tr><Th>Tax</Th><Th right>Output tax</Th><Th right>Input credit (ITC)</Th><Th right>Net payable</Th></tr></thead>
          <tbody>
            {["CGST", "SGST", "IGST"].map((t) => <tr key={t}><Td>{t}</Td><Td right>{num(data.outputTax[t])}</Td><Td right>{num(data.inputTaxCredit[t])}</Td><Td right>{num(data.netPayable[t])}</Td></tr>)}
            <tr><Td bold>Total</Td><Td right bold>{num(data.totalOutput)}</Td><Td right bold>{num(data.totalITC)}</Td><Td right bold>{num(data.totalPayable)}</Td></tr>
          </tbody></table>
        <h4 style={{ margin: "20px 0 8px" }}>Outward supplies by GST rate</h4>
        <table style={s.table}><thead><tr><Th>Rate</Th><Th right>Taxable</Th><Th right>CGST</Th><Th right>SGST</Th><Th right>IGST</Th></tr></thead>
          <tbody>{data.outwardByRate.length === 0 && <Empty cols={5} />}{data.outwardByRate.map((r) => <tr key={r.rate}><Td>{r.rate}%</Td><Td right>{num(r.taxable)}</Td><Td right>{num(r.cgst)}</Td><Td right>{num(r.sgst)}</Td><Td right>{num(r.igst)}</Td></tr>)}</tbody></table>
        <p style={s.sub}>B2B taxable: {money(data.b2bTaxable)} | B2C taxable: {money(data.b2cTaxable)}</p>
        <p style={{ ...s.sub, fontSize: 12 }}>{data.note}</p>
      </div>
    );

    if (tab === "stock") return (
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 12 }}>
          <Field label="Item stock ledger"><select style={s.input} value={item} onChange={(e) => setItem(e.target.value)}><option value="">Valuation summary</option>{items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}</select></Field>
        </div>
        {item ? <StockLedger id={item} /> : (
          <table style={s.table}><thead><tr><Th>Item</Th><Th>HSN</Th><Th right>Qty</Th><Th right>Avg cost</Th><Th right>Value</Th></tr></thead>
            <tbody>
              {data.rows.length === 0 && <Empty cols={5} />}
              {data.rows.map((r) => <tr key={r.item}><Td>{r.name}</Td><Td>{r.hsnCode}</Td><Td right>{num(r.qty)} {r.unit}</Td><Td right>{num(r.avgCost)}</Td><Td right>{num(r.value)}</Td></tr>)}
              <tr><Td bold>Total stock value</Td><Td /><Td /><Td /><Td right bold>{num(data.total)}</Td></tr>
            </tbody></table>
        )}
      </div>
    );

    if (tab === "cash") return (
      <table style={s.table}><thead><tr><Th>Source</Th><Th right>Inflow</Th><Th right>Outflow</Th><Th right>Net</Th></tr></thead>
        <tbody>
          <tr><Td bold>Opening cash & bank</Td><Td /><Td /><Td right bold>{num(data.opening)}</Td></tr>
          {data.rows.map((r) => <tr key={r.type}><Td>{r.type}</Td><Td right>{num(r.inflow)}</Td><Td right>{num(r.outflow)}</Td><Td right>{num(r.net)}</Td></tr>)}
          <tr><Td bold>Closing cash & bank</Td><Td right bold>{num(data.totalIn)}</Td><Td right bold>{num(data.totalOut)}</Td><Td right bold>{num(data.closing)}</Td></tr>
        </tbody></table>
    );
    return null;
  };

  return (
    <Sidebar>
      <div style={s.wrap}>
        <PageHead title="Reports" sub="Every report is generated from the ledger vouchers">
          <button style={s.btn2} onClick={csv}>Export CSV</button>
          <button style={s.btn2} onClick={() => window.print()}>Print</button>
        </PageHead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...s.btn2, ...(tab === k && { background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" }) }}>{label}</button>
          ))}
        </div>

        <div style={{ ...s.card, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          {NEEDS_RANGE.includes(tab) && (<>
            <Field label="Financial year"><select style={s.input} value={fy} onChange={(e) => { setFy(e.target.value); setFrom(""); setTo(""); }}>{periods.map((p) => <option key={p.fy} value={p.fy}>{p.label}</option>)}</select></Field>
            <Field label="Custom from"><input type="date" style={s.input} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Custom to"><input type="date" style={s.input} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </>)}
          {NEEDS_ASON.includes(tab) && <Field label="As on"><input type="date" style={s.input} value={asOn} onChange={(e) => setAsOn(e.target.value)} /></Field>}
          {tab === "ledger" && (
            <Field label="Account"><select style={{ ...s.input, minWidth: 240 }} value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.subGroup || a.group})</option>)}
            </select></Field>
          )}
          {tab === "day" && <span style={s.sub}>Reversals appear as separate entries so history is never lost.</span>}
        </div>

        <div id="report-area" style={{ ...s.card, overflowX: "auto" }}>{renderBody()}</div>
      </div>
    </Sidebar>
  );
}

function StockLedger({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { axios.get(`${API}/reports/stock-ledger`, { params: { item: id } }).then((r) => setD(r.data)).catch(() => setD(null)); }, [id]);
  if (!d) return <div style={s.sub}>Loading...</div>;
  return (
    <table style={s.table}><thead><tr><Th>Date</Th><Th>Ref</Th><Th>Type</Th><Th right>In</Th><Th right>Out</Th><Th right>Balance</Th></tr></thead>
      <tbody>{d.rows.map((r, i) => <tr key={i}><Td>{r.date ? fmtDate(r.date) : "-"}</Td><Td>{r.refNo}</Td><Td>{r.kind}</Td><Td right>{r.in ? num(r.in) : ""}</Td><Td right>{r.out ? num(r.out) : ""}</Td><Td right>{num(r.balance)}</Td></tr>)}</tbody></table>
  );
}
