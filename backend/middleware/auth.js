const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey123"; // set JWT_SECRET in .env for production

const tokenUser = async (req) => {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  const decoded = jwt.verify(h.slice(7), JWT_SECRET);
  return User.findById(decoded.id).select("-password");
};

// Requires a valid login token
const protect = async (req, res, next) => {
  try {
    const user = await tokenUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised, please login again" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Session expired, please login again" });
  }
};

// Used on /register: attaches req.user if a valid token is sent, never fails
const optionalAuth = async (req, res, next) => {
  try { req.user = await tokenUser(req); } catch { /* ignore */ }
  next();
};

// Everyone logged in can read (GET); only `roles` can create/change/cancel
const canWrite = (roles) => (req, res, next) =>
  req.method === "GET" || roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: `Your role (${req.user.role}) cannot modify this data` });

// Only `roles` can use the resource at all (reports, audit)
const canAccess = (roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: `Your role (${req.user.role}) cannot access this data` });

module.exports = { JWT_SECRET, protect, optionalAuth, canWrite, canAccess };
