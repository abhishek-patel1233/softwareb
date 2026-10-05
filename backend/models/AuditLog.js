const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    userName: String,
    role: String,
    action: { type: String, required: true }, // CREATE / CANCEL / UPDATE / REVERSE ...
    entity: { type: String, required: true }, // Invoice, Purchase, Payment ...
    entityId: mongoose.Schema.Types.ObjectId,
    docNo: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditSchema);
