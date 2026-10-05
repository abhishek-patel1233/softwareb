import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Navbar";

function DynamicPricingCalculator() {
  const [rates, setRates] = useState({
    rentPerUserMonthly: 150,
    purchasePerUserOneTime: 3500,
    supportFeeMonthly: 500,
  });

  const [pricingMode, setPricingMode] = useState("rent");
  const [userCount, setUserCount] = useState(5);
  const [rentMonths, setRentMonths] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [search, setSearch] = useState("");

  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/pricing-config")
      .then((res) => {
        if (res.data) setRates(res.data);
      })
      .catch(() => console.log("Using default config rates"));
  }, []);

  useEffect(() => {
    let baseAmount = 0;
    if (pricingMode === "rent") {
      baseAmount =
        userCount * rates.rentPerUserMonthly * rentMonths +
        rates.supportFeeMonthly;
    } else {
      baseAmount = userCount * rates.purchasePerUserOneTime;
    }

    const gst = baseAmount * 0.18;
    const total = baseAmount + gst;

    setSubTotal(baseAmount);
    setTaxAmount(gst);
    setGrandTotal(total);
  }, [pricingMode, userCount, rentMonths, rates]);

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.phone) {
      alert("Please enter Customer Name and Phone Number.");
      return;
    }

    try {
      const payload = {
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        pricingMode,
        userCount,
        rentMonths: pricingMode === "rent" ? rentMonths : 0,
        subTotal,
        gstAmount: taxAmount,
        grandTotal,
      };

      await axios.post("http://localhost:5000/api/quotations", payload);
      alert(
        `Quotation Saved! Grand Total: ₹${grandTotal.toLocaleString("en-IN")}`
      );
      setCustomerInfo({ name: "", phone: "" });
    } catch (err) {
      alert("Failed to save quotation lead.");
    }
  };

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <div style={uiStyles.wrapper}>
        {/* Header Banner */}
        <div style={uiStyles.headerContainer}>
          <div style={uiStyles.badge}>SaaS Estimator</div>
          <h2 style={uiStyles.title}>Dynamic Pricing & Quotation Calculator</h2>
          <p style={uiStyles.subtitle}>
            Real-time user tier calculation backed by MongoDB database API
          </p>
        </div>

        <form onSubmit={handleSaveQuotation} style={uiStyles.cardGrid}>
          {/* Left Column: Form Controls */}
          <div style={uiStyles.leftPanel}>
            {/* Plan Switcher */}
            <div>
              <label style={uiStyles.label}>Pricing Plan</label>
              <div style={uiStyles.toggleContainer}>
                <button
                  type="button"
                  onClick={() => setPricingMode("rent")}
                  style={{
                    ...uiStyles.toggleBtn,
                    ...(pricingMode === "rent"
                      ? uiStyles.activeToggle
                      : uiStyles.inactiveToggle),
                  }}
                >
                  <span style={{ fontWeight: "700" }}>Monthly Rent</span>
                  <span style={uiStyles.priceTag}>
                    ₹{rates.rentPerUserMonthly}/usr
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMode("purchase")}
                  style={{
                    ...uiStyles.toggleBtn,
                    ...(pricingMode === "purchase"
                      ? uiStyles.activeToggle
                      : uiStyles.inactiveToggle),
                  }}
                >
                  <span style={{ fontWeight: "700" }}>One-Time</span>
                  <span style={uiStyles.priceTag}>
                    ₹{rates.purchasePerUserOneTime}/usr
                  </span>
                </button>
              </div>
            </div>

            {/* User Range Slider */}
            <div>
              <div
                style={{
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label style={uiStyles.label}>Users / Seats</label>
                <span style={uiStyles.highlightUserCount}>
                  {userCount} Seats
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={userCount}
                onChange={(e) => setUserCount(Number(e.target.value))}
                style={uiStyles.slider}
              />
            </div>

            {/* Rental Duration Dropdown */}
            {pricingMode === "rent" && (
              <div>
                <label style={uiStyles.label}>Rental Duration</label>
                <select
                  value={rentMonths}
                  onChange={(e) => setRentMonths(Number(e.target.value))}
                  style={uiStyles.selectInput}
                >
                  <option value={1}>1 Month (Standard)</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months (5% Discount)</option>
                  <option value={12}>12 Months (10% Discount)</option>
                </select>
              </div>
            )}

            {/* Customer Info Section */}
            <div style={uiStyles.leadSection}>
              <label
                style={{
                  ...uiStyles.label,
                  color: "#0f172a",
                  marginBottom: "6px",
                }}
              >
                Customer Details
              </label>
              <input
                type="text"
                placeholder="Customer Name"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                style={uiStyles.textInput}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
                style={uiStyles.textInput}
                required
              />
            </div>
          </div>

          {/* Right Column: Dynamic Price Summary Card */}
          <div style={uiStyles.summaryCard}>
            <div>
              <div style={uiStyles.summaryHeader}>
                <h3 style={uiStyles.summaryTitle}>Live Quote Breakdown</h3>
                <span style={uiStyles.statusBadge}>Live Rate</span>
              </div>

              <div style={uiStyles.lineItems}>
                <div style={uiStyles.row}>
                  <span>Pricing Model:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {pricingMode === "rent"
                      ? "Monthly Rental"
                      : "One-Time License"}
                  </strong>
                </div>

                <div style={uiStyles.row}>
                  <span>Selected Seats:</span>
                  <span>{userCount} Users</span>
                </div>

                {pricingMode === "rent" && (
                  <div style={uiStyles.row}>
                    <span>Duration:</span>
                    <span>{rentMonths} Month(s)</span>
                  </div>
                )}

                <div style={uiStyles.row}>
                  <span>Subtotal (Base):</span>
                  <span>₹{subTotal.toLocaleString("en-IN")}</span>
                </div>

                <div style={uiStyles.row}>
                  <span>GST (18%):</span>
                  <span>₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Total Calculation & CTA */}
            <div style={uiStyles.totalDivider}>
              <div style={uiStyles.grandTotalRow}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  Grand Total:
                </span>
                <span style={uiStyles.grandTotalText}>
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button type="submit" style={uiStyles.submitButton}>
                Save Lead & Submit Quote
              </button>
            </div>
          </div>
        </form>
      </div>
    </Sidebar>
  );
}

// Custom CSS-in-JS Object for UI Styling
const uiStyles = {
  wrapper: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    border: "1px solid #e2e8f0",
    fontFamily: "'Inter', sans-serif",
    textAlign: "left",
    boxSizing: "border-box",
  },
  headerContainer: {
    textAlign: "left",
    marginBottom: "28px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "16px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#eff6ff",
    color: "#4f46e5",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "13px",
    margin: 0,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "28px",
    alignItems: "stretch",
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
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
  toggleContainer: {
    display: "flex",
    gap: "12px",
  },
  toggleBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.2s ease",
  },
  activeToggle: {
    border: "2px solid #4f46e5",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    fontWeight: "700",
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.15)",
  },
  inactiveToggle: {
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    fontWeight: "500",
  },
  priceTag: {
    fontSize: "11px",
    opacity: 0.85,
  },
  highlightUserCount: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    fontSize: "12px",
    padding: "2px 8px",
    borderRadius: "6px",
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    accentColor: "#4f46e5",
    height: "6px",
    cursor: "pointer",
  },
  selectInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#334155",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  leadSection: {
    borderTop: "1px solid #f1f5f9",
    paddingTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  textInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  summaryCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    justify: "space-between",
    textAlign: "left",
  },
  summaryHeader: {
    display: "flex",
    justify: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
  summaryTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  lineItems: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    fontSize: "13px",
    color: "#475569",
  },
  row: {
    display: "flex",
    justify: "space-between",
  },
  totalDivider: {
    borderTop: "2px dashed #cbd5e1",
    paddingTop: "16px",
    marginTop: "20px",
  },
  grandTotalRow: {
    display: "flex",
    justify: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  grandTotalText: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#4f46e5",
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.2)",
  },
};

export default DynamicPricingCalculator;