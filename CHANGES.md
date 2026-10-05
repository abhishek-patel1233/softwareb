# Accounting upgrade - kya badla hai

## Setup (ek baar)
1. backend/.env banao (.env.example copy karo) - JWT_SECRET zaroor badlo.
2. cd backend && npm install && npm run dev
3. cd frontend && npm install && npm run dev
4. Pehla register hone wala user = admin. Uske baad public register sirf "auditor" (read-only) banata hai;
   admin login karke role de sakta hai (accountant / manager / sales / purchase / auditor).
5. Purane invoices hain to ek baar: cd backend && node scripts/migrateInvoices.js
6. Settings -> Company me GSTIN/State bharo (CGST+SGST vs IGST isi se decide hota hai).

## Backend (naya)
models: Account, Voucher, Counter, Company, AuditLog, StockMovement, Purchase, Payment, Expense, Note (Invoice/Item extend)
services: accounting.js (double-entry engine), gst.js, stock.js, utils.js
APIs: /api/purchases /payments /expenses /notes /accounts /vouchers /settings /audit /reports/*
Rules: debit=credit validation, sequential numbers (INV-2026-0001), period lock, cancel = reversal voucher,
       server-side GST calc, duplicate supplier-bill block, role-based access, audit log.

## Frontend
Naye: Purchases, Payments, Notes, Reports (10 reports), Settings (company, lock, ledgers, journal, audit), acc.jsx (shared)
Badle: App.jsx (auth guard, ./Expense import fix), main.jsx (token interceptor), Navbar.jsx (menu/logout), Dashboard.jsx (ledger-based)
