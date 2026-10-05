import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Navbar";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    category: "Office Supplies",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMode: "UPI / QR",
    vendorName: "",
    status: "Paid",
    note: "",
  });

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      const res = await axios.get("https://softwareb.onrender.com/api/expenses");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setExpenses(data);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://softwareb.onrender.com/api/expenses", formData);
      alert("Expense Recorded Successfully!");
      setFormData({
        title: "",
        category: "Office Supplies",
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0],
        paymentMode: "UPI / QR",
        vendorName: "",
        status: "Paid",
        note: "",
      });
      fetchExpenses();
    } catch (err) {
      alert("Error recording expense: " + (err.response?.data?.message || err.message));
    }
  };

  // Filter Logic
  const filteredExpenses = expenses.filter((exp) => {
    const query = search.toLowerCase();
    const matchesSearch =
      String(exp.title || "").toLowerCase().includes(query) ||
      String(exp.category || "").toLowerCase().includes(query) ||
      String(exp.vendorName || "").toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "All" || exp.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculations for KPI Cards
  const totalExpenseAmount = expenses.reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0
  );

  const totalPendingAmount = expenses
    .filter((item) => item.status === "Pending")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <style>{`
        /* Global & Desktop Styles */
        .exp-container {
          width: 100%;
          max-width: 1150px;
          margin: 0 auto;
          text-align: left;
        }
        .exp-header {
          margin-bottom: 20px;
        }
        .exp-title {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 700;
        }
        .exp-subtitle {
          color: #64748b;
          margin: 4px 0 0 0;
          font-size: 13px;
        }
        .exp-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .exp-stat-card {
          background-color: #ffffff;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .exp-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }
        .exp-card-title {
          margin: 0 0 18px 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 700;
        }
        .exp-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .exp-field {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .exp-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }
        .exp-input, .exp-select {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          color: #0f172a;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .exp-input:focus, .exp-select:focus {
          background-color: #ffffff;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .exp-btn {
          padding: 10px 22px;
          background-color: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .exp-btn:hover {
          background-color: #4338ca;
        }
        .exp-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .exp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          background-color: #ffffff;
        }
        .exp-table th {
          background-color: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .exp-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
        }

        /* Mobile Responsive View */
        @media screen and (max-width: 640px) {
          .exp-title { font-size: 18px !important; }
          .exp-subtitle { font-size: 11px !important; }
          .exp-card { padding: 16px !important; }
          .exp-card-title { font-size: 14px !important; margin-bottom: 12px !important; }
          .exp-form-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .exp-label { font-size: 11px !important; }
          .exp-input, .exp-select { padding: 7px 10px !important; font-size: 11px !important; }
          .exp-btn { width: 100%; padding: 9px !important; font-size: 12px !important; }
          .exp-table th { padding: 8px 10px !important; font-size: 10px !important; }
          .exp-table td { padding: 8px 10px !important; font-size: 11px !important; }
        }
      `}</style>

      <div className="exp-container">
        {/* Header */}
        <div className="exp-header">
          <h2 className="exp-title">Business Expenses</h2>
          <p className="exp-subtitle">
            Track operational expenses, vendor bills, utility payments, and office costs.
          </p>
        </div>

        {/* Stats KPI Cards */}
        <div className="exp-stats-grid">
          <div className="exp-stat-card">
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Total Expenses</p>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                ₹{totalExpenseAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              💸
            </div>
          </div>

          <div className="exp-stat-card">
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Pending Bills</p>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                ₹{totalPendingAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fffbe1", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              ⏳
            </div>
          </div>

          <div className="exp-stat-card">
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Recorded Expenses</p>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                {expenses.length} Entries
              </h3>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              📋
            </div>
          </div>
        </div>

        {/* Add Expense Form Card */}
        <div className="exp-card">
          <h3 className="exp-card-title">+ Add New Expense Entry</h3>
          <form onSubmit={handleSubmit}>
            <div className="exp-form-grid">
              <div className="exp-field">
                <label className="exp-label">Expense Title / Reason</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Internet Bill / Office Rent"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="exp-input"
                />
              </div>

              <div className="exp-field">
                <label className="exp-label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="exp-select"
                >
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Rent & Maintenance">Rent & Maintenance</option>
                  <option value="Electricity & Water">Electricity & Water</option>
                  <option value="Internet & Phone">Internet & Phone</option>
                  <option value="Salaries & Wages">Salaries & Wages</option>
                  <option value="Travel & Transport">Travel & Transport</option>
                  <option value="Marketing & Ads">Marketing & Ads</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="exp-field">
                <label className="exp-label">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="exp-input"
                />
              </div>

              <div className="exp-field">
                <label className="exp-label">Expense Date</label>
                <input
                  type="date"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleChange}
                  required
                  className="exp-input"
                />
              </div>

              <div className="exp-field">
                <label className="exp-label">Payment Mode</label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  className="exp-select"
                >
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer</option>
                  <option value="Credit/Debit Card">Credit/Debit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="exp-field">
                <label className="exp-label">Vendor / Paid To (Optional)</label>
                <input
                  type="text"
                  name="vendorName"
                  placeholder="e.g. Airtel / Landlord Name"
                  value={formData.vendorName}
                  onChange={handleChange}
                  className="exp-input"
                />
              </div>

              <div className="exp-field">
                <label className="exp-label">Payment Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="exp-select"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="exp-field" style={{ marginBottom: "16px" }}>
              <label className="exp-label">Note / Remark (Optional)</label>
              <input
                type="text"
                name="note"
                placeholder="Additional description or transaction ref id..."
                value={formData.note}
                onChange={handleChange}
                className="exp-input"
              />
            </div>

            <button type="submit" className="exp-btn">
              Save Expense Entry
            </button>
          </form>
        </div>

        {/* Expenses List Table Card */}
        <div className="exp-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 className="exp-card-title" style={{ margin: 0 }}>Expense Records</h3>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="exp-select"
              style={{ width: "auto", minWidth: "160px" }}
            >
              <option value="All">All Categories</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Rent & Maintenance">Rent & Maintenance</option>
              <option value="Electricity & Water">Electricity & Water</option>
              <option value="Internet & Phone">Internet & Phone</option>
              <option value="Salaries & Wages">Salaries & Wages</option>
              <option value="Travel & Transport">Travel & Transport</option>
              <option value="Marketing & Ads">Marketing & Ads</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="exp-table-wrapper">
            <table className="exp-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Paid To</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "24px",
                      }}
                    >
                      No expense entries found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp._id || idx}>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>
                        {exp.title}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ color: "#64748b" }}>
                        {exp.expenseDate
                          ? new Date(exp.expenseDate).toLocaleDateString("en-IN")
                          : "-"}
                      </td>
                      <td>{exp.vendorName || "-"}</td>
                      <td>{exp.paymentMode}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            fontSize: "10px",
                            fontWeight: "600",
                            backgroundColor:
                              exp.status === "Paid" ? "#dcfce7" : "#fef3c7",
                            color: exp.status === "Paid" ? "#166534" : "#b45309",
                          }}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                        ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default Expenses;