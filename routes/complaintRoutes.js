// routes/complaintRoutes.js
const express = require("express");
const router = express.Router();
const Complaint = require("../model/Complaint");
const GP = require("../model/gp");
const auth = require("../middleware/auth");
const multer = require("multer");
const User = require("../model/user");
const nodemailer = require("nodemailer");

const upload = multer({ dest: "uploads/" });

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// ✅ Citizen submits complaint
router.post("/add", async (req, res) => {
  const { state, district, taluk, gramPanchayat } = req.body;

  if (!state || !district || !taluk || !gramPanchayat) {
    return res.status(400).json({ error: "Complete location details are required" });
  }

  const gp = await GP.findOne({
    state: { $regex: new RegExp(`^${state.trim()}$`, "i") },
    district: { $regex: new RegExp(`^${district.trim()}$`, "i") },
    taluk: { $regex: new RegExp(`^${taluk.trim()}$`, "i") },
    gramPanchayat: { $regex: new RegExp(`^${gramPanchayat.trim()}$`, "i") }
  });

  if (!gp) {
    return res.status(404).json({ error: "No Gram Panchayat account is currently registered for this location." });
  }

  const complaint = new Complaint({
    ...req.body,
    gpId: gp._id
  });

  await complaint.save();
  res.json({ message: "Complaint submitted" });
});


// ✅ GP sees their complaints
router.get("/gp", auth, async (req, res) => {
  try {
    const data = await Complaint.find({ gpId: req.user.id }).populate("userId").sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ GP Dashboard Stats
router.get("/gp/stats", auth, async (req, res) => {
  try {
    const gpId = req.user.id;
    const pending = await Complaint.countDocuments({ gpId, status: "Pending" });
    const actionTaken = await Complaint.countDocuments({ gpId, status: "Action Taken" });
    const closed = await Complaint.countDocuments({ gpId, status: "Closed" });
    const total = await Complaint.countDocuments({ gpId });

    res.json({ pending, actionTaken, closed, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Action Taken
router.put("/action/:id", auth, async (req, res) => {
  const { actionTaken } = req.body;

  const complaint = await Complaint.findOne({
    _id: req.params.id,
    gpId: req.user.id
  });

  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found or unauthorized" });
  }

  if (complaint.isFinal) {
    return res.status(403).json({ message: "Complaint is permanently completed and cannot be modified." });
  }

  complaint.status = "Action Taken";
  complaint.actionTaken = actionTaken;

  await complaint.save();

  res.json({ message: "Action updated" });
});


// ✅ GP Dropdown Status Update & Email
router.put("/status/:id", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, gpId: req.user.id }).populate("userId");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found or unauthorized" });
    }

    if (complaint.isFinal) {
      return res.status(403).json({ message: "Complaint is permanently completed and cannot be modified." });
    }

    complaint.status = status;
    if (status === "Closed") {
      complaint.closedAt = new Date();
    }
    await complaint.save();

    // Send email notification to user if closed
    if (status === "Closed" && complaint.userId && complaint.userId.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: complaint.userId.email,
          subject: "Complaint Closed",
          text: `Dear ${complaint.userId.name || 'Citizen'},\n\nYour complaint regarding "${complaint.category}" has been resolved successfully by your Gram Panchayat.\n\nThank you for reaching out.`
        });
      } catch (error) {
        console.error("Failed to send closure email:", error);
      }
    }

    res.json({ message: "Status updated successfully", complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Close Complaint + Upload Image
router.put("/close/:id", auth, upload.single("image"), async (req, res) => {
  const complaint = await Complaint.findOne({
    _id: req.params.id,
    gpId: req.user.id
  }).populate("userId"); // Populate user to get their email address

  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found or unauthorized" });
  }

  if (complaint.isFinal) {
    return res.status(403).json({ message: "Complaint is permanently completed and cannot be modified." });
  }

  complaint.status = "Closed";
  // Replace backslashes with forward slashes for Windows compatibility
  complaint.closedPhoto = req.file.path.replace(/\\/g, "/");
  complaint.closedAt = new Date();

  await complaint.save();

  // ✅ Send email notification to user
  if (complaint.userId && complaint.userId.email) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: complaint.userId.email,
        subject: "Your Complaint has been Closed",
        text: `Dear Citizen,\n\nYour complaint regarding "${complaint.category}" submitted on ${new Date(complaint.createdAt).toLocaleDateString()} has been marked as Closed by your Gram Panchayat.\n\nAction Taken: ${complaint.actionTaken || 'Issue resolved'}\n\nThank you for reaching out.`
      });
    } catch (error) {
      console.error("Failed to send closure email:", error);
    }
  }

  res.json({ message: "Complaint closed" });
});

// ✅ API: PUT /api/complaints/:id/close (Mapped via /complaint/:id/close in server.js)
router.put("/:id/close", auth, upload.single("photo"), async (req, res) => {
  try {
    const { remark } = req.body;
    if (!remark || !remark.trim()) {
      return res.status(400).json({ message: "Closing remark is required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Closing photo is required" });
    }

    const complaint = await Complaint.findOne({ 
      _id: req.params.id, 
      gpId: req.user.id 
    }).populate("userId");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found or unauthorized" });
    }

    if (complaint.isFinal) {
      return res.status(403).json({ message: "Complaint is permanently completed and cannot be modified." });
    }

    if (complaint.status === "Closed") {
      return res.status(400).json({ message: "Complaint is already closed" });
    }

    // Update required fields
    complaint.status = "Closed";
    complaint.isFinal = true;
    complaint.closingRemark = remark.trim();
    complaint.closedPhoto = req.file.path.replace(/\\/g, "/"); // Normalize slashes for URL viewing
    complaint.closedAt = new Date();
    await complaint.save();

    // Send automated email notification to user regarding closure remark
    if (complaint.userId && complaint.userId.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: complaint.userId.email,
          subject: "Complaint Resolved & Closed",
          text: `Dear ${complaint.userId.name || 'Citizen'},\n\nYour complaint regarding "${complaint.category}" has been marked as Closed by the Gram Panchayat.\n\nClosing Remark: ${complaint.closingRemark}\n\nThank you for reaching out.`
        });
      } catch (error) {
        console.error("Failed to send closure remark email:", error);
      }
    }

    res.json({ message: "Complaint closed successfully", complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ API: PUT /api/complaints/:id/complete
router.put("/:id/complete", auth, upload.single("photo"), async (req, res) => {
  try {
    const { remark } = req.body;
    
    if (!remark || !remark.trim()) {
      return res.status(400).json({ message: "Remark is required to complete the complaint" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Resolution photo is required" });
    }

    const complaint = await Complaint.findOne({ 
      _id: req.params.id, 
      gpId: req.user.id 
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found or unauthorized" });
    }
    if (complaint.isFinal) {
      return res.status(403).json({ message: "Complaint is already finalized and cannot be modified." });
    }

    complaint.status = "Completed";
    complaint.isFinal = true;
    complaint.completedRemark = remark.trim();
    complaint.completedPhoto = req.file.path.replace(/\\/g, "/"); // Normalize slashes for URL viewing

    await complaint.save();
    res.json({ message: "Complaint permanently marked as Completed", complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;