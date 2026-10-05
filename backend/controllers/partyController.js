const Party = require("../models/Party");

// Naya Party Add Karna
const createParty = async (req, res) => {
  try {
    const party = await Party.create(req.body);
    res.status(201).json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Saare Parties ki List Mangwana
const getParties = async (req, res) => {
  try {
    const parties = await Party.find({});
    res.json(parties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createParty, getParties };