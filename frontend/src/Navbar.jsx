import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ children, search, setSearch }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("userInfo")) || {}; } catch { return {}; } })();
  const logout = () => { localStorage.removeItem("userInfo"); navigate("/login"); };

  // Direct Single-Click Menu Items matching your project components
  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Invoices / Sales", path: "/invoices", icon: "💰" },
    { label: "Create Invoice", path: "/CreateInvoice", icon: "📝" },
    { label: "Inventory Items", path: "/items", icon: "📦" },
    { label: "Customers & Vendors", path: "/parties", icon: "👥" },
    { label: "Pricing Calculator", path: "/pricing-calculator", icon: "🧮" },
    { label: "Purchases", path: "/purchases", icon: "🛒" },
    { label: "Payments / Receipts", path: "/payments", icon: "💳" },
    { label: "Credit / Debit Notes", path: "/notes", icon: "🧾" },
    { label: "Expenses", path: "/expenses", icon: "💸" },
    { label: "Reports", path: "/reports", icon: "📈" },
    { label: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans">
      {/* MOBILE TOPBAR */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 shadow">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white focus:outline-none"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              A
            </div>
            <span className="font-semibold text-base tracking-wide">
              Astcomm Infotel
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-slate-800 text-slate-300">
            🔔
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-medium text-xs">
            A
          </div>
        </div>
      </div>

      {/* BACKDROP FOR MOBILE */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR (DESKTOP & MOBILE DRAWER) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 border-r border-slate-800`}
      >
        {/* BRAND HEADER */}
        <div className="p-5 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/30">
            A
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wide leading-tight">
              Astcomm Infotel
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              Business Suite
            </p>
          </div>
        </div>

        {/* NAVIGATION LINKS (DIRECT CLICK - NO SUBMENUS) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* FOOTER USER / LOGOUT */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                A
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user.name || "User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Astcomm Infotel
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-400 hover:text-red-400 text-sm p-1.5 transition-colors"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* DESKTOP TOPBAR */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-snug">
              Astcomm Infotel
            </h2>
            <p className="text-xs text-slate-500">
              Business Management & Operations
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* <div className="relative w-64">
              <input
                type="text"
                placeholder="Search invoice, party or item..."
                value={search || ""}
                onChange={(e) => setSearch && setSearch(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                🔍
              </span>
            </div> */}

            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm relative">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
            </button>

            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  {user.name || "User"}
                </div>
                <div className="text-[10px] text-slate-400" style={{ textTransform: "capitalize" }}>
                  {user.role || "user"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* INNER CONTENT AREA */}
        <main className="p-4 md:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}