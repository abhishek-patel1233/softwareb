const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// 1. Middlewares PEHLE aane chahiye
app.use(cors());
app.use(express.json());

// 2. Routes Modules
const { protect, canWrite, canAccess } = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const partyRoutes = require("./routes/partyRoutes");
const itemRoutes = require("./routes/itemRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const noteRoutes = require("./routes/noteRoutes");
const reportRoutes = require("./routes/reportRoutes");
const accountingRoutes = require("./routes/accountingRoutes");

// 3. Mount Routes  (everything except /api/auth needs login; writes are role-restricted)
//    Roles: admin, accountant, manager, sales, purchase, auditor (read-only)
app.use("/api/auth", authRoutes);
app.use("/api/parties", protect, canWrite(["admin", "accountant", "manager", "sales", "purchase"]), partyRoutes);
app.use("/api/items", protect, canWrite(["admin", "accountant", "manager", "sales", "purchase"]), itemRoutes);
app.use("/api/invoices", protect, canWrite(["admin", "accountant", "manager", "sales"]), invoiceRoutes);
app.use("/api/purchases", protect, canWrite(["admin", "accountant", "manager", "purchase"]), purchaseRoutes);
app.use("/api/payments", protect, canWrite(["admin", "accountant", "manager"]), paymentRoutes);
app.use("/api/expenses", protect, canWrite(["admin", "accountant", "manager"]), expenseRoutes);
app.use("/api/notes", protect, canWrite(["admin", "accountant", "manager"]), noteRoutes);
app.use("/api/reports", protect, canAccess(["admin", "accountant", "manager", "auditor"]), reportRoutes);
app.use("/api", protect, accountingRoutes);

// 4. Central error handler (Express 5 forwards async errors here)
app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;
  if (err.name === "ValidationError" || err.name === "CastError") status = 400;
  if (err.code === 11000) { status = 409; message = "Duplicate entry: " + Object.keys(err.keyValue || {}).join(", "); }
  if (status === 500) console.error(err);
  res.status(status).json({ message });
});

// 5. Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/accounting";

if (!process.env.JWT_SECRET) console.warn("WARNING: JWT_SECRET is not set in .env - using an insecure default.");

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected Successfully");
    await require("./services/accounting").ensureSystemAccounts(); // chart of accounts + default ledgers
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.log("DB Connection Error:", err));
