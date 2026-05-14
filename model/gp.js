const mongoose = require("mongoose");

const gpSchema = new mongoose.Schema({
  gp_email: {
    type: String,
    required: true,
    unique: true
  },
  gp_password: {
    type: String,
    required: true
  },
  state: { type: String },
  district: { type: String },
  taluk: { type: String },
  gramPanchayat: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("GP", gpSchema);
