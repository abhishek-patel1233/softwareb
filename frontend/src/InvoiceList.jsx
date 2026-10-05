import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import Sidebar from "./Navbar";

const COMPANY = {
  name: "ASTCOMM INFOTEL",
  address: "F2-59, R Galleria Arcade, Runwal Garden, Dombivli East, Maharashtra - 421201",
  mobiles: "+91 97025 32212",
  email: "accounts@example.com",
  gstin: "27XXXXXXXXXX1ZX",
  pan: "XXXXXXXXXX",
  bankName: "HDFC Bank",
  accountNo: "50200000000000",
  ifsc: "HDFC0001234",
  upi: "payments@astcomm",
};

const TERMS = [
  "1. Payment due as per agreed credit terms.",
  "2. Goods/services subject to agreed warranty terms.",
  "3. Disputes subject to jurisdiction of Dombivli, Maharashtra.",
];

function numberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num)) return "";
  num = Math.round(num);
  if (num === 0) return "Zero";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const twoDigits = (n) => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  };

  const threeDigits = (n) => {
    if (n >= 100) {
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
    }
    return twoDigits(n);
  };

  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  if (crore) result += threeDigits(crore) + " Crore ";
  if (lakh) result += threeDigits(lakh) + " Lakh ";
  if (thousand) result += threeDigits(thousand) + " Thousand ";
  if (hundred) result += threeDigits(hundred);

  return result.trim();
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState("");
  const printRef = useRef();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get("https://softwareb.onrender.com/api/invoices");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setInvoices(data);
      } catch (err) {
        console.error("Error fetching invoices:", err);
      }
    };
    fetchInvoices();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("invoice-capture-area");
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `Invoice_${selectedInvoice?.invoiceNumber || "Draft"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: "avoid-all" } // Prevent second blank page
    };

    html2pdf().set(opt).from(element).save();
  };

  const grandTotal = selectedInvoice?.grandTotal || 0;
  const subTotal = selectedInvoice?.subTotal || 0;
  const amountInWords = `Indian Rupees ${numberToWordsIndian(grandTotal)} Only`;

  const gstRate = selectedInvoice?.items?.find((it) => it.gstRate)?.gstRate || 5;
  const halfRate = gstRate / 2;
  const isIntra = selectedInvoice?.stateType === "INTRA";

  const totalTax = isIntra
    ? (selectedInvoice?.cgst || 0) + (selectedInvoice?.sgst || 0)
    : selectedInvoice?.igst || 0;

  const filteredInvoices = invoices.filter((inv) => {
    const query = search.toLowerCase();
    return (
      String(inv.invoiceNumber || "").toLowerCase().includes(query) ||
      String(inv.party?.name || "").toLowerCase().includes(query)
    );
  });

  const itemsList = selectedInvoice?.items || [];
  const emptyRowsCount = Math.max(0, 3 - itemsList.length);

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <style>{`
        /* PDF Page Single-Page Fit Styling */
        .pdf-page {
          width: 210mm;
          min-height: 285mm;
          max-height: 290mm;
          padding: 8mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          overflow: hidden;
        }

        .header-bg {
          background-color: #0b3558;
          color: #ffffff;
          padding: 8px 12px;
          border-bottom: 3px solid #f97316;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-bg h1 {
          color: #ffffff !important;
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .meta-table, .items-table, .tax-table {
          width: 100%;
          border-collapse: collapse;
        }

        .meta-table td {
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          padding: 4px 6px;
          font-size: 9.5px;
        }

        .meta-label {
          font-weight: 700;
          color: #0b3558;
        }

        .section-header {
          background-color: #0b3558;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          padding: 4px 6px;
          text-transform: uppercase;
        }

        .items-table th, .tax-table th {
          background-color: #0b3558;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          padding: 4px 6px;
          border: 1px solid #0b3558;
        }

        .items-table td, .tax-table td {
          border: 1px solid #e2e8f0;
          padding: 4px 6px;
          font-size: 9.5px;
        }

        .grand-total-banner {
          background-color: #f97316;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 12px;
          font-weight: 800;
        }

        /* Strictly Hide Top Header / Navbar when printing */
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-capture-area, #invoice-capture-area * {
            visibility: visible !important;
          }
          #invoice-capture-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 290mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      <div style={{ maxWidth: "1150px", margin: "0 auto", textAlign: "left" }}>
        {!selectedInvoice ? (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: "700" }}>
                All Sales Invoices
              </h2>
            </div>

            <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 12px", fontSize: "11px", fontWeight: "600" }}>Invoice No</th>
                    <th style={{ padding: "10px 12px", fontSize: "11px", fontWeight: "600" }}>Customer</th>
                    <th style={{ padding: "10px 12px", fontSize: "11px", fontWeight: "600" }}>Date</th>
                    <th style={{ padding: "10px 12px", fontSize: "11px", fontWeight: "600" }}>Total</th>
                    <th style={{ padding: "10px 12px", fontSize: "11px", fontWeight: "600" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, idx) => (
                    <tr key={inv._id || idx} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                      <td style={{ padding: "10px 12px", fontWeight: "700" }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: "10px 12px" }}>{inv.party?.name || "N/A"}</td>
                      <td style={{ padding: "10px 12px" }}>{new Date(inv.createdAt || Date.now()).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: "10px 12px", fontWeight: "700" }}>₹{inv.grandTotal?.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ padding: "4px 10px", backgroundColor: "#0b3558", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {/* Buttons Section (Hidden in Print/PDF) */}
            <div className="no-print" style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
              >
                ← Back
              </button>
              <button
                onClick={handleDownloadPDF}
                style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
              >
                📥 Download PDF
              </button>
              <button
                onClick={handlePrint}
                style={{ padding: "8px 16px", backgroundColor: "#0b3558", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
              >
                🖨️ Print Invoice
              </button>
            </div>

            {/* Target Ref container for PDF Export */}
            <div id="invoice-capture-area" ref={printRef} className="pdf-page">
              {/* Header */}
              <div className="header-bg">
                <div>
                  <h1>{COMPANY.name}</h1>
                  <p style={{ margin: "2px 0 0 0", fontSize: "8.5px", opacity: 0.9 }}>{COMPANY.address}</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "8.5px", opacity: 0.9 }}>
                    GSTIN: {COMPANY.gstin} | PAN: {COMPANY.pan} | {COMPANY.mobiles} | {COMPANY.email}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800", letterSpacing: "1px" }}>TAX INVOICE</h2>
                  <p style={{ margin: "2px 0 0 0", fontSize: "7.5px", fontWeight: "700", textTransform: "uppercase" }}>ORIGINAL FOR RECIPIENT</p>
                  <p style={{ margin: "1px 0 0 0", fontSize: "7.5px", opacity: 0.8 }}>Computer Generated</p>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div style={{ marginTop: "6px" }}>
                <table className="meta-table">
                  <tbody>
                    <tr>
                      <td style={{ width: "15%" }} className="meta-label">Invoice No.</td>
                      <td style={{ width: "20%" }}>{selectedInvoice.invoiceNumber}</td>
                      <td style={{ width: "15%" }} className="meta-label">Invoice Date</td>
                      <td style={{ width: "18%" }}>{new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ width: "14%" }} className="meta-label">Due Date</td>
                      <td style={{ width: "18%" }}>{new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                    <tr>
                      <td className="meta-label">Place of Supply</td>
                      <td>Maharashtra (27)</td>
                      <td className="meta-label">Supply Type</td>
                      <td>{isIntra ? "Intra-State" : "Inter-State"}</td>
                      <td className="meta-label">Reverse Charge</td>
                      <td>No</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bill To & Ship To */}
              <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>
                  <div className="section-header">BILL TO</div>
                  <div style={{ border: "1px solid #e2e8f0", borderTop: "none", padding: "5px 7px", fontSize: "9.5px", backgroundColor: "#fff" }}>
                    <div style={{ fontWeight: "700", fontSize: "10px", color: "#0f172a" }}>
                      {selectedInvoice.party?.name || "Abhishek Patel"}
                    </div>
                    <div style={{ color: "#475569", marginTop: "1px" }}>123 Business Park, Andheri East, Mumbai - 400069</div>
                    <div style={{ color: "#475569", marginTop: "1px" }}>
                      GSTIN: {selectedInvoice.party?.gstin || "27AAACA1234A1Z5"} | State: Maharashtra (27)
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-header">SHIP TO</div>
                  <div style={{ border: "1px solid #e2e8f0", borderTop: "none", padding: "5px 7px", fontSize: "9.5px", backgroundColor: "#fff" }}>
                    <div style={{ fontWeight: "700", fontSize: "10px", color: "#0f172a" }}>
                      {selectedInvoice.party?.name || "Abhishek Patel"}
                    </div>
                    <div style={{ color: "#475569", marginTop: "1px" }}>123 Business Park, Andheri East, Mumbai - 400069</div>
                    <div style={{ color: "#475569", marginTop: "1px" }}>
                      Contact: +91 98765 43210 | State: Maharashtra (27)
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginTop: "6px" }}>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%", textAlign: "center" }}>Sr.</th>
                      <th style={{ width: "12%", textAlign: "center" }}>HSN/SAC</th>
                      <th style={{ width: "38%", textAlign: "left" }}>Description</th>
                      <th style={{ width: "7%", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "8%", textAlign: "center" }}>Unit</th>
                      <th style={{ width: "10%", textAlign: "right" }}>Rate</th>
                      <th style={{ width: "8%", textAlign: "right" }}>Discount</th>
                      <th style={{ width: "12%", textAlign: "right" }}>Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsList.map((item, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: "center" }}>{i + 1}</td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>9983</td>
                        <td>
                          <div style={{ fontWeight: "700" }}>{item.name}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "center" }}>User</td>
                        <td style={{ textAlign: "right" }}>Rs. {(item.price || 0).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>Rs. {(item.discount || 0).toFixed(2)}</td>
                        <td style={{ textAlign: "right", fontWeight: "600" }}>Rs. {(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}

                    {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                      <tr key={`empty-${idx}`}>
                        <td style={{ height: "18px" }}></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ))}

                    <tr style={{ backgroundColor: "#f8fafc", fontWeight: "700" }}>
                      <td colSpan="7" style={{ textAlign: "right", paddingRight: "8px" }}>Subtotal</td>
                      <td style={{ textAlign: "right" }}>Rs. {subTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Summary Table */}
              <div style={{ marginTop: "6px" }}>
                <div className="section-header" style={{ textAlign: "center" }}>TAX SUMMARY</div>
                <table className="tax-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%", textAlign: "center" }}>Taxable Value</th>
                      {isIntra ? (
                        <>
                          <th style={{ width: "25%", textAlign: "center" }}>CGST @ {halfRate}%</th>
                          <th style={{ width: "25%", textAlign: "center" }}>SGST @ {halfRate}%</th>
                        </>
                      ) : (
                        <th style={{ width: "50%", textAlign: "center" }}>IGST @ {gstRate}%</th>
                      )}
                      <th style={{ width: "25%", textAlign: "center" }}>Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ textAlign: "center", fontWeight: "600" }}>
                      <td>Rs. {subTotal.toFixed(2)}</td>
                      {isIntra ? (
                        <>
                          <td>Rs. {(selectedInvoice.cgst || (subTotal * halfRate) / 100).toFixed(2)}</td>
                          <td>Rs. {(selectedInvoice.sgst || (subTotal * halfRate) / 100).toFixed(2)}</td>
                        </>
                      ) : (
                        <td>Rs. {(selectedInvoice.igst || (subTotal * gstRate) / 100).toFixed(2)}</td>
                      )}
                      <td>Rs. {totalTax.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount Before Tax & Total GST Inline */}
              <div style={{ marginTop: "5px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "5px 8px", display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontWeight: "700" }}>
                <div>
                  Amount Before Tax: <span style={{ marginLeft: "6px" }}>Rs. {subTotal.toFixed(2)}</span>
                </div>
                <div>
                  Total GST: <span style={{ marginLeft: "6px" }}>Rs. {totalTax.toFixed(2)}</span>
                </div>
              </div>

              {/* Full Width Grand Total */}
              <div className="grand-total-banner" style={{ marginTop: "5px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.5px" }}>GRAND TOTAL</span>
                <span style={{ fontSize: "15px" }}>Rs. {grandTotal.toFixed(2)}</span>
              </div>

              {/* Chargeable Amount & Status */}
              <div style={{ marginTop: "5px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "7.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>AMOUNT CHARGEABLE IN WORDS</div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#0f172a", marginTop: "1px" }}>{amountInWords}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "7.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>PAYMENT STATUS</div>
                  <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#16a34a", marginTop: "1px" }}>PAYMENT DUE</div>
                </div>
              </div>

              {/* Footer Details */}
              <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1.2fr 1.3fr 1fr", gap: "6px", border: "1px solid #e2e8f0", padding: "6px" }}>
                <div>
                  <div style={{ fontSize: "8.5px", fontWeight: "700", color: "#0b3558", marginBottom: "2px" }}>BANK / PAYMENT DETAILS</div>
                  <div style={{ fontSize: "7.5px", color: "#334155", lineHeight: "1.3" }}>
                    Bank: <strong>{COMPANY.bankName}</strong><br />
                    A/c No.: <strong>{COMPANY.accountNo}</strong><br />
                    IFSC: <strong>{COMPANY.ifsc}</strong><br />
                    UPI: <strong>{COMPANY.upi}</strong>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "8.5px", fontWeight: "700", color: "#0b3558", marginBottom: "2px" }}>TERMS & NOTES</div>
                  <div style={{ fontSize: "7.5px", color: "#475569", lineHeight: "1.2" }}>
                    {TERMS.map((t, idx) => (
                      <div key={idx}>{t}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "right" }}>
                  <div style={{ fontSize: "7.5px", fontWeight: "700", color: "#0b3558" }}>FOR {COMPANY.name}</div>
                  <div style={{ marginTop: "15px", fontSize: "7.5px", borderTop: "1px dashed #cbd5e1", paddingTop: "2px", color: "#64748b" }}>
                    Authorised Signatory
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}