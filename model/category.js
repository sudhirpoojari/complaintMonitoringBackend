const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categories: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("categories", categorySchema);