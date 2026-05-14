const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express()
require("dotenv").config(); 
const port = process.env.PORT || 3000

// Import model
const User = require("./model/user");
const Location = require("./model/location");
const Category = require("./model/category");
const Complaint = require("./model/Complaint");
const GP = require("./model/gp");

const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const { log } = require("node:console");

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads")); // Serve uploaded files statically

// Connect MongoDB
mongoose.connect(process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/complaint")
.then(async () => {
  console.log("MongoDB Connected");
  await ensureDefaultGp();
})
.catch(err => console.log(err));

async function ensureDefaultGp() {
  try {
    const email = "gp1@example.com";
    const password = "password123";

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await GP.findOneAndUpdate(
      { gp_email: email },
      { 
        gp_password: hashedPassword,
        state: "Karnataka", 
        district: "Udupi", 
        taluk: "Karkala", 
        gramPanchayat: "Nitte"
      },
      { upsert: true, new: true }
    );
    console.log(`Default GP account ensured: ${email}`);
  } catch (error) {
    console.error("Failed to seed default GP account:", error.message);
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/', (req, res) => {
  res.send('Got a POST request')
})

app.post("/register", async (req, res) => {
    try {
        // Get form data
       
        const { name, email, mobile, password ,state, district, taluk, gramPanchayat} = req.body;   

     const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            mobile,
            password: hashedPassword,   
            state,
            district,
            taluk,
            gramPanchayat,
        });
        await newUser.save();

        res.json({ message: "User saved successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.use("/gp", require("./routes/gpRoutes"));
app.use("/complaint", require("./routes/complaintRoutes"));



app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) {
    return res.status(400).json({ message: "Wrong password" });
  }
      // ✅ Create token
      const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
      );

      res.json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get("/dashboard", auth, (req, res) => {
  res.json({ message: "Welcome Dashboard" });
});


// routes/locationRoutes.js
app.get("/states", async (req, res) => {


  const data = await Location.find({}, "state");
  res.json(data);
});

app.get("/getcategory",async (req, res) => {
  try{
 const data = await Category.find({}, "category");
  res.json(data);
  }
  catch(error){
    res.status(500).json({error:error.message});
  }
 
});

app.post("/saveComplaint", async (req, res) => {
  try {
    const { category, latitude, longitude, state, district, taluk, gramPanchayat, image, remarks, userId } = req.body;

    // Validation
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (latitude === null || latitude === undefined) {
      return res.status(400).json({ error: "Latitude is required" });
    }
    if (longitude === null || longitude === undefined) {
      return res.status(400).json({ error: "Longitude is required" });
    }
    if (!image) {
      return res.status(400).json({ error: "Image is required" });
    }

    if (!state || !district || !taluk || !gramPanchayat) {
      return res.status(400).json({ error: "Complete location details (State, District, Taluk, Gram Panchayat) are required" });
    }

    // Trim whitespace to ensure safe matching
    const cleanState = state.trim();
    const cleanDistrict = district.trim();
    const cleanTaluk = taluk.trim();
    const cleanGP = gramPanchayat.trim();

    // Dynamically find the correct Gram Panchayat to assign this complaint to
    const gp = await GP.findOne({
      state: { $regex: new RegExp(`^${cleanState}$`, "i") },
      district: { $regex: new RegExp(`^${cleanDistrict}$`, "i") },
      taluk: { $regex: new RegExp(`^${cleanTaluk}$`, "i") },
      gramPanchayat: { $regex: new RegExp(`^${cleanGP}$`, "i") }
    });

    if (!gp) {
      return res.status(404).json({ error: "No Gram Panchayat account is currently registered for this location." });
    }

    const newComplaint = new Complaint({
      category,
      latitude,
      longitude,
      state,
      district,
      taluk,
      gramPanchayat,
      image,
      remarks,
      userId,
      gpId: gp._id,
      activities: [{
        actionType: "Complaint Filed",
        remark: remarks || "Initial complaint submitted by citizen",
        photo: image
      }]
    });

    await newComplaint.save();
    res.status(201).json({ message: "Complaint saved successfully", complaint: newComplaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/districts/:state", async (req, res) => {
  const data = await Location.findOne({ state: req.params.state });
  if (!data) return res.status(404).json({ msg: "State not found" });
  res.json(data.districts);
});



app.get("/taluks/:state/:district", async (req, res) => {
  const data = await Location.findOne({ state: req.params.state });
  if (!data) return res.status(404).json({ msg: "State not found" });

  const district = data?.districts.find(
    (d) => d.name === req.params.district
  );

  if (!district) return res.status(404).json({ msg: "District not found" });

  res.json(district.taluks);
});

app.get("/gp/:state/:district/:taluk", async (req, res) => {
  const { state, district, taluk } = req.params;

  const data = await Location.findOne({ state });
  if (!data) return res.status(404).json({ msg: "State not found" });

  const districtData = data.districts.find(
    (d) => d.name === district
  );
  if (!districtData) return res.status(404).json({ msg: "District not found" });

  const talukData = districtData.taluks.find(
    (t) => t.name === taluk
  );
  if (!talukData) return res.status(404).json({ msg: "Taluk not found" });

  res.json(talukData.gramPanchayats);
});

 



app.get("/user", async (req,res) => {    
    try{
         const users= await User.find();
         res.json(users);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
})



app.delete('/user/:id', (req, res) => {
   // const id = req.params.id;
  res.send(`Got a DELETE request at /user ${req.params.id}`);
  //res.send(`User ${req.params.id}`)
  //console.log(id);
})

// Get all complaints with optional status filter
app.get("/complaints", auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { userId: req.user.userId }; // Filter by logged-in user
    
    if (status) {
      query.status = status;
    }
    
    const complaints = await Complaint.find(query).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complaint statistics
app.get("/complaint-stats", auth, async (req, res) => {
  try {
    const userId = req.user.userId; // Filter by logged-in user
    const pending = await Complaint.countDocuments({ userId, status: "Pending" });
    const actionTaken = await Complaint.countDocuments({ userId, status: "Action Taken" });
    const completed = await Complaint.countDocuments({ userId, status: "Completed" });
    const closed = await Complaint.countDocuments({ userId, status: "Closed" });
    const total = await Complaint.countDocuments({ userId });

    res.json({
      pending,
      actionTaken,
      completed,
      closed,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export complaints as Excel
app.get("/complaints/export/excel", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const complaints = await Complaint.find({ userId })
      .populate("userId", "name mobile")
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Complaints Report");

    worksheet.columns = [
      { header: "Complaint ID", key: "id", width: 15 },
      { header: "Citizen Name", key: "name", width: 20 },
      { header: "Mobile No.", key: "mobile", width: 15 },
      { header: "Category / Issue", key: "category", width: 25 },
      { header: "Location", key: "location", width: 25 },
      { header: "Status", key: "status", width: 15 },
      { header: "Date & Time", key: "date", width: 22 },
    ];

    complaints.forEach((c) => {
      worksheet.addRow({
        id: c._id.toString().slice(-6).toUpperCase(),
        name: c.userId?.name || "N/A",
        mobile: c.userId?.mobile || "N/A",
        category: c.category,
        location: `${c.taluk}, ${c.gramPanchayat}`,
        status: c.status,
        date: new Date(c.createdAt).toLocaleString(),
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Complaint_Report.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
});

// Export complaints as PDF
app.get("/complaints/export/pdf", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const complaints = await Complaint.find({ userId })
      .populate("userId", "name mobile")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Complaint_Report.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Complaint Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: "right" });
    doc.moveDown(2);

    const tableTop = 150;
    doc.font("Helvetica-Bold");
    doc.text("ID", 50, tableTop);
    doc.text("Category", 120, tableTop);
    doc.text("Location", 250, tableTop);
    doc.text("Status", 400, tableTop);
    doc.text("Date", 480, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font("Helvetica");

    complaints.forEach((c) => {
      if (y > 750) { doc.addPage(); y = 50; }
      doc.text(c._id.toString().slice(-6).toUpperCase(), 50, y);
      doc.text(c.category.substring(0, 20), 120, y);
      doc.text(`${c.taluk}`.substring(0, 20), 250, y);
      doc.text(c.status, 400, y);
      doc.text(new Date(c.createdAt).toLocaleDateString(), 480, y);
      y += 20;
    });

    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

// Update complaint status
app.put("/complaint/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, photo } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const validStatuses = ["Pending", "In Progress", "Action Taken", "Completed", "Closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.status === "Closed") {
      return res.status(400).json({ error: "This complaint is permanently closed and cannot be updated." });
    }

    complaint.status = status;
    complaint.activities.push({
      actionType: `Status changed to ${status}`,
      remark: remark || "",
      photo: photo || ""
    });

    await complaint.save();

    res.json({ message: "Status updated successfully", complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
