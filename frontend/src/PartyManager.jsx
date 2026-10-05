import React, { useState, useEffect } from "react";
import axios from "axios";

import Sidebar from "./Navbar";
function PartyManager() {
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "Customer",
    partyType: "Customer",
    gstin: "",
    phone: "",
    address: "",
    state: "Madhya Pradesh",
    openingBalance: 0,
  });

  const fetchParties = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/parties");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setParties(data);
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    if (e.target.name === "partyType" || e.target.name === "type") {
      setFormData({ ...formData, partyType: value, type: value });
    } else {
      setFormData({ ...formData, [e.target.name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        type: formData.partyType || formData.type,
      };

      await axios.post("http://localhost:5000/api/parties", payload);
      alert("Party Added Successfully!");
      setFormData({
        name: "",
        type: "Customer",
        partyType: "Customer",
        gstin: "",
        phone: "",
        address: "",
        state: "Madhya Pradesh",
        openingBalance: 0,
      });
      fetchParties();
    } catch (err) {
      alert("Error adding party: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredParties = parties.filter((p) => {
    const query = search.toLowerCase();
    return (
      String(p.name || "").toLowerCase().includes(query) ||
      String(p.phone || "").toLowerCase().includes(query) ||
      String(p.gstin || "").toLowerCase().includes(query)
    );
  });

  // Reusable inline styles object
  const styles = {
    container: {
      width: "100%",
      maxWidth: "1150px",
      margin: "0 auto",
      textAlign: "left",
    },
    headerSection: {
      marginBottom: "24px",
      textAlign: "left",
    },
    title: {
      margin: 0,
      color: "#0f172a",
      fontSize: "22px",
      fontWeight: "700",
    },
    subtitle: {
      color: "#64748b",
      margin: "4px 0 0 0",
      fontSize: "13px",
    },
    card: {
      backgroundColor: "#ffffff",
      padding: "24px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      marginBottom: "28px",
      textAlign: "left",
    },
    cardTitle: {
      margin: "0 0 20px 0",
      color: "#1e293b",
      fontSize: "16px",
      fontWeight: "700",
      textAlign: "left",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "16px",
    },
    fieldGroup: {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: "600",
      color: "#475569",
      marginBottom: "6px",
      textAlign: "left",
    },
    input: {
      width: "100%",
      padding: "9px 12px",
      borderRadius: "8px",
      border: "1px solid #cbd5e1",
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      fontSize: "13px",
      outline: "none",
      boxSizing: "border-box",
    },
    button: {
      padding: "10px 22px",
      backgroundColor: "#4f46e5",
      color: "#ffffff",
      border: "none",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
    },
    tableWrapper: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
    },
    th: {
      backgroundColor: "#f8fafc",
      color: "#475569",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
      padding: "12px 14px",
      borderBottom: "1px solid #e2e8f0",
      textAlign: "left",
    },
    td: {
      padding: "12px 14px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: "13px",
      color: "#334155",
      textAlign: "left",
    },
  };

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Customer & Vendor Master</h2>
          <p style={styles.subtitle}>
            Manage all clients, suppliers, GST numbers, and billing addresses.
          </p>
        </div>

        {/* Add Party Form Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>+ Add New Customer / Supplier</h3>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Party Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Business / Contact Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Party Type</label>
                <select
                  name="partyType"
                  value={formData.partyType}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="10-Digit Mobile"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>GSTIN (Optional)</label>
                <input
                  type="text"
                  name="gstin"
                  placeholder="15-Digit GST Number"
                  value={formData.gstin}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Opening Balance (₹)</label>
                <input
                  type="number"
                  name="openingBalance"
                  placeholder="0"
                  value={formData.openingBalance}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ ...styles.fieldGroup, marginBottom: "20px" }}>
              <label style={styles.label}>Address</label>
              <input
                type="text"
                name="address"
                placeholder="Billing / Delivery Address"
                value={formData.address}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.button}>
              Save Party Details
            </button>
          </form>
        </div>

        {/* List Table Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Registered Parties</h3>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Party Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>GSTIN</th>
                  <th style={styles.th}>State</th>
                  <th style={styles.th}>Opening Bal</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "24px",
                      }}
                    >
                      No registered parties found.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((party) => {
                    const partyKind = party.type || party.partyType || "Customer";
                    const isSupplier = partyKind === "Supplier";

                    return (
                      <tr key={party._id || party.id}>
                        <td style={{ ...styles.td, fontWeight: "600", color: "#0f172a" }}>
                          {party.name}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: "600",
                              backgroundColor: isSupplier ? "#fffbe1" : "#eff6ff",
                              color: isSupplier ? "#d97706" : "#2563eb",
                              border: isSupplier ? "1px solid #fde68a" : "1px solid #bfdbfe",
                            }}
                          >
                            {partyKind}
                          </span>
                        </td>
                        <td style={styles.td}>{party.phone}</td>
                        <td style={styles.td}>{party.gstin || "URP (Unregistered)"}</td>
                        <td style={styles.td}>{party.state}</td>
                        <td style={{ ...styles.td, fontWeight: "600" }}>
                          ₹{party.openingBalance || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default PartyManager;