const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  gramPanchayat: { type: String, required: true },
  image: { type: String, required: true },
  remarks: { type: String },
  gpId: { type: mongoose.Schema.Types.ObjectId, ref: "GP" },
  status: { type: String, default: "Pending" },
  activities: [{
    actionType: { type: String, required: true },
    remark: { type: String },
    photo: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);