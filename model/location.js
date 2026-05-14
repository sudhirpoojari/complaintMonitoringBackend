// models/Location.js
const mongoose = require("mongoose");

// Taluk Schema
const talukSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    gramPanchayats: [{ type: String, trim: true }] // ✅ array of strings
  },
  { _id: false }
);

// District Schema
const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    taluks: [talukSchema]
  },
  { _id: false }
);

// Main Schema
const locationSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, trim: true },
    districts: [districtSchema]
  },
  { timestamps: true }
);

// Optional index
locationSchema.index({ state: 1 });

module.exports = mongoose.model("Location", locationSchema);