import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Navbar";

// Astcomm Infotel State Code (Madhya Pradesh)
const SELLER_STATE_CODE = "23";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedParty, setSelectedParty] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState([
    {
      itemId: "",
      name: "",
      quantity: 1,
      price: 0,
      discount: 0,
      gstRate: 18,
      amount: 0,
    },
  ]);

  // Fetch Parties & Items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partyRes, itemRes] = await Promise.all([
          axios.get("https://softwareb.onrender.com/api/parties"),
          axios.get("https://softwareb.onrender.com/api/items"),
        ]);

        const partyData = Array.isArray(partyRes.data)
          ? partyRes.data
          : partyRes.data?.data || [];
        const itemData = Array.isArray(itemRes.data)
          ? itemRes.data
          : itemRes.data?.data || [];

        setParties(partyData);
        setAvailableItems(itemData);
      } catch (err) {
        console.error("Error loading master data:", err);
      }
    };
    fetchData();
  }, []);

  // Handle Party Selection & Auto-detect Tax Type (INTRA vs INTER)
  const handlePartyChange = (partyId) => {
    const party = parties.find((p) => p._id === partyId);
    setSelectedParty(party || null);
  };

  // Determine State Type
  const partyStateCode = selectedParty?.stateCode || SELLER_STATE_CODE;
  const isIntraState = partyStateCode === SELLER_STATE_CODE;
  const stateType = isIntraState ? "INTRA" : "INTER";

  // Item Management inside Table
  const handleItemSelect = (index, itemId) => {
    const selected = availableItems.find((i) => i._id === itemId);
    const updated = [...items];
    if (selected) {
      const price = Number(selected.sellingPrice || 0);
      const qty = updated[index].quantity || 1;
      const disc = updated[index].discount || 0;
      const gst = Number(selected.gstRate || 18);
      const taxable = (price - disc) * qty;

      updated[index] = {
        ...updated[index],
        itemId: selected._id,
        name: selected.name,
        price: price,
        gstRate: gst,
        amount: Math.max(0, taxable),
      };
    } else {
      updated[index].itemId = "";
      updated[index].name = "";
    }
    setItems(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...items];
    const val = Number(value) || 0;
    updated[index][field] = val;

    const qty = field === "quantity" ? val : updated[index].quantity;
    const price = field === "price" ? val : updated[index].price;
    const disc = field === "discount" ? val : updated[index].discount;

    const taxable = (price - disc) * qty;
    updated[index].amount = Math.max(0, taxable);

    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        itemId: "",
        name: "",
        quantity: 1,
        price: 0,
        discount: 0,
        gstRate: 18,
        amount: 0,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subTotal = items.reduce((acc, it) => acc + (it.amount || 0), 0);

  // Average GST or Line Item Tax Calculation
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  items.forEach((it) => {
    const taxable = it.amount || 0;
    const taxAmt = (taxable * (it.gstRate || 0)) / 100;
    if (isIntraState) {
      totalCGST += taxAmt / 2;
      totalSGST += taxAmt / 2;
    } else {
      totalIGST += taxAmt;
    }
  });

  const grandTotal = subTotal + totalCGST + totalSGST + totalIGST;

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParty) {
      alert("Please select a customer party first.");
      return;
    }

    if (items.some((i) => !i.name)) {
      alert("Please select items for all rows.");
      return;
    }

    const payload = {
      party: selectedParty,
      stateType,
      items,
      subTotal,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      grandTotal,
      createdAt: invoiceDate,
    };

    try {
      await axios.post("https://softwareb.onrender.com/api/invoices", payload);
      alert("Invoice Created Successfully!");
      navigate("/invoices");
    } catch (err) {
      console.error("Error creating invoice:", err);
      alert("Failed to create invoice: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <style>{`
        .ci-container {
          width: 100%;
          max-width: 1150px;
          margin: 0 auto;
          text-align: left;
        }
        .ci-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }
        .ci-title {
          margin: 0 0 4px 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 700;
        }
        .ci-subtitle {
          color: #64748b;
          margin: 0 0 20px 0;
          font-size: 13px;
        }
        .ci-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .ci-field {
          display: flex;
          flex-direction: column;
        }
        .ci-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }
        .ci-input, .ci-select {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          color: #0f172a;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .ci-input:focus, .ci-select:focus {
          background-color: #ffffff;
          border-color: #4f46e5;
        }
        .ci-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }
        .ci-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          background-color: #ffffff;
        }
        .ci-table th {
          background-color: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .ci-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }
        .ci-summary-box {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          max-width: 320px;
          margin-left: auto;
        }
        .ci-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          color: #334155;
        }
        .ci-btn-add {
          padding: 8px 16px;
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .ci-btn-submit {
          padding: 11px 24px;
          background-color: #16a34a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Mobile View Rules */
        @media screen and (max-width: 640px) {
          .ci-title { font-size: 18px !important; }
          .ci-card { padding: 14px !important; }
          .ci-grid-3 { grid-template-columns: 1fr !important; gap: 10px !important; }
          .ci-label { font-size: 11px !important; }
          .ci-input, .ci-select { padding: 7px 10px !important; font-size: 11px !important; }
          .ci-table th { font-size: 10px !important; padding: 6px 8px !important; }
          .ci-table td { font-size: 11px !important; padding: 6px 6px !important; }
          .ci-summary-box { max-width: 100% !important; margin-top: 16px; }
        }
      `}</style>

      <div className="ci-container">
        <div className="ci-card">
          <h2 className="ci-title">Create Sales Invoice</h2>
          <p className="ci-subtitle">Generate tax invoice for clients with automatic GST calculation.</p>

          <form onSubmit={handleSubmit}>
            {/* Header Details */}
            <div className="ci-grid-3">
              <div className="ci-field">
                <label className="ci-label">Select Customer (Party)</label>
                <select
                  value={selectedParty?._id || ""}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  required
                  className="ci-select"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.gstin ? `(${p.gstin})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ci-field">
                <label className="ci-label">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                  className="ci-input"
                />
              </div>

              <div className="ci-field">
                <label className="ci-label">Tax Type (Auto-Detect)</label>
                <input
                  type="text"
                  readOnly
                  value={
                    stateType === "INTRA"
                      ? "INTRA-STATE (CGST + SGST)"
                      : "INTER-STATE (IGST)"
                  }
                  style={{
                    backgroundColor: stateType === "INTRA" ? "#dcfce7" : "#ffedd5",
                    color: stateType === "INTRA" ? "#166534" : "#9a3412",
                    fontWeight: "700",
                  }}
                  className="ci-input"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="ci-table-wrapper">
              <table className="ci-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Product / Service</th>
                    <th style={{ width: "12%" }}>Qty</th>
                    <th style={{ width: "15%" }}>Rate (₹)</th>
                    <th style={{ width: "12%" }}>Disc (₹)</th>
                    <th style={{ width: "12%" }}>GST %</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Taxable Amt</th>
                    <th style={{ width: "4%", textAlign: "center" }}>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="ci-select"
                          required
                        >
                          <option value="">-- Choose Item --</option>
                          {availableItems.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} (₹{item.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                          className="ci-input"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                          className="ci-input"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.discount}
                          onChange={(e) => handleRowChange(idx, "discount", e.target.value)}
                          className="ci-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.gstRate}
                          onChange={(e) => handleRowChange(idx, "gstRate", e.target.value)}
                          className="ci-input"
                          required
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>
                        ₹{row.amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={addItemRow} className="ci-btn-add" style={{ marginBottom: "20px" }}>
              + Add Item Row
            </button>

            {/* Calculations & Total Summary */}
            <div className="ci-summary-box">
              <div className="ci-summary-row">
                <span>Subtotal (Taxable):</span>
                <strong>₹{subTotal.toFixed(2)}</strong>
              </div>

              {isIntraState ? (
                <>
                  <div className="ci-summary-row">
                    <span>CGST:</span>
                    <span>₹{totalCGST.toFixed(2)}</span>
                  </div>
                  <div className="ci-summary-row">
                    <span>SGST:</span>
                    <span>₹{totalSGST.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="ci-summary-row">
                  <span>IGST:</span>
                  <span>₹{totalIGST.toFixed(2)}</span>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #cbd5e1", margin: "10px 0" }} />

              <div className="ci-summary-row" style={{ fontSize: "15px", color: "#0f172a", fontWeight: "700" }}>
                <span>Grand Total:</span>
                <span style={{ color: "#16a34a" }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button type="submit" className="ci-btn-submit">
                Save & Generate Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </Sidebar>
  );
}