import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Navbar";

function ItemManager() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    hsnCode: "",
    unit: "Pcs",
    purchasePrice: "",
    sellingPrice: "",
    gstRate: 18,
    openingStock: 0,
  });

  const fetchItems = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/items");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/items", formData);
      alert("Item Added Successfully!");
      setFormData({
        name: "",
        hsnCode: "",
        unit: "Pcs",
        purchasePrice: "",
        sellingPrice: "",
        gstRate: 18,
        openingStock: 0,
      });
      fetchItems();
    } catch (err) {
      alert("Error adding item: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase();
    return (
      String(item.name || "").toLowerCase().includes(query) ||
      String(item.hsnCode || "").toLowerCase().includes(query)
    );
  });

  return (
    <Sidebar search={search} setSearch={setSearch}>
      <style>{`
        /* Global & Desktop Styles */
        .im-container {
          width: 100%;
          max-width: 1150px;
          margin: 0 auto;
          text-align: left;
        }
        .im-header {
          margin-bottom: 20px;
        }
        .im-title {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 700;
        }
        .im-subtitle {
          color: #64748b;
          margin: 4px 0 0 0;
          font-size: 13px;
        }
        .im-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }
        .im-card-title {
          margin: 0 0 18px 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 700;
        }
        .im-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .im-field {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .im-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }
        .im-input, .im-select {
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
        .im-input:focus, .im-select:focus {
          background-color: #ffffff;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .im-btn {
          padding: 10px 22px;
          background-color: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .im-btn:hover {
          background-color: #4338ca;
        }
        .im-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .im-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          background-color: #ffffff;
        }
        .im-table th {
          background-color: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .im-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
        }

        /* Mobile View Rules (Small Font & Compact Layout) */
        @media screen and (max-width: 640px) {
          .im-title {
            font-size: 18px !important;
          }
          .im-subtitle {
            font-size: 11px !important;
          }
          .im-card {
            padding: 16px !important;
          }
          .im-card-title {
            font-size: 14px !important;
            margin-bottom: 12px !important;
          }
          .im-form-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .im-label {
            font-size: 11px !important;
          }
          .im-input, .im-select {
            padding: 7px 10px !important;
            font-size: 11px !important;
          }
          .im-btn {
            width: 100%;
            padding: 9px !important;
            font-size: 12px !important;
          }
          .im-table th {
            padding: 8px 10px !important;
            font-size: 10px !important;
          }
          .im-table td {
            padding: 8px 10px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      <div className="im-container">
        {/* Header Section */}
        <div className="im-header">
          <h2 className="im-title">Item & Inventory Master</h2>
          <p className="im-subtitle">
            Manage your products, services, GST rates, prices, and stock inventory.
          </p>
        </div>

        {/* Add Item Form */}
        <div className="im-card">
          <h3 className="im-card-title">+ Add New Product / Service</h3>
          <form onSubmit={handleSubmit}>
            <div className="im-form-grid">
              <div className="im-field">
                <label className="im-label">Item Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Wireless Mouse"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="im-input"
                />
              </div>

              <div className="im-field">
                <label className="im-label">HSN / SAC Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  placeholder="e.g. 8471"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  required
                  className="im-input"
                />
              </div>

              <div className="im-field">
                <label className="im-label">Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="im-select"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Kg">Kg</option>
                  <option value="Meter">Meter</option>
                  <option value="Box">Box</option>
                  <option value="Litre">Litre</option>
                </select>
              </div>

              <div className="im-field">
                <label className="im-label">GST Rate</label>
                <select
                  name="gstRate"
                  value={formData.gstRate}
                  onChange={handleChange}
                  className="im-select"
                >
                  <option value="0">0% (Exempted)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>

              <div className="im-field">
                <label className="im-label">Purchase Price (₹)</label>
                <input
                  type="number"
                  name="purchasePrice"
                  placeholder="0.00"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  required
                  className="im-input"
                />
              </div>

              <div className="im-field">
                <label className="im-label">Selling Price (₹)</label>
                <input
                  type="number"
                  name="sellingPrice"
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  required
                  className="im-input"
                />
              </div>

              <div className="im-field">
                <label className="im-label">Opening Stock Qty</label>
                <input
                  type="number"
                  name="openingStock"
                  placeholder="0"
                  value={formData.openingStock}
                  onChange={handleChange}
                  className="im-input"
                />
              </div>
            </div>

            <button type="submit" className="im-btn">
              Save Item
            </button>
          </form>
        </div>

        {/* Items Table */}
        <div className="im-card">
          <h3 className="im-card-title">Product & Service List</h3>
          <div className="im-table-wrapper">
            <table className="im-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>HSN Code</th>
                  <th>Unit</th>
                  <th>Purchase Price</th>
                  <th>Selling Price</th>
                  <th>GST %</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "24px",
                      }}
                    >
                      No products or services found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item._id || item.id}>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>
                        {item.name}
                      </td>
                      <td>{item.hsnCode || "-"}</td>
                      <td>{item.unit}</td>
                      <td>₹{Number(item.purchasePrice || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: "600", color: "#059669" }}>
                        ₹{Number(item.sellingPrice || 0).toFixed(2)}
                      </td>
                      <td>{item.gstRate}%</td>
                      <td style={{ fontWeight: "600" }}>
                        {item.openingStock || 0} {item.unit}
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

export default ItemManager;