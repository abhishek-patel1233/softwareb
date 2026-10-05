import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import PartyManager from "./PartyManager";
import ItemManager from "./ItemManager";
import CreateInvoice from "./CreateInvoice";
import InvoiceList from "./InvoiceList";
import DynamicPricingCalculator from "./PricingCalculator";
import Expenses from "./Expense";
import Purchases from "./Purchases";
import Payments from "./Payments";
import Notes from "./Notes";
import Reports from "./Reports";
import Settings from "./Settings";

// Everything except login/register needs a saved token
function RequireAuth() {
  const token = (() => { try { return JSON.parse(localStorage.getItem("userInfo"))?.token; } catch { return null; } })();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* App Routes */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/parties" element={<PartyManager />} />
        <Route path="/items" element={<ItemManager />} />
        <Route path="/createinvoice" element={<CreateInvoice />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/pricing-calculator" element={<DynamicPricingCalculator />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
