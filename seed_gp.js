require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const GP = require("./model/gp");

const URI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/complaint";

// Edit these details when you want to register a new Gram Panchayath
const NEW_GP_DETAILS = {
  gp_email: "gp_mysore1@example.com",
  gp_password: "securepassword123", // This will be safely hashed
  state: "Karnataka",
  district: "Mysore",
  taluk: "Mysore",
  gramPanchayat: "GP1"
};

const registerGP = async () => {
  try {
    await mongoose.connect(URI);
    console.log("Connected to MongoDB.");

    // 1. Check for duplicates
    const existing = await GP.findOne({ gp_email: NEW_GP_DETAILS.gp_email });
    if (existing) {
      console.log(`❌ Registration failed: GP with email ${NEW_GP_DETAILS.gp_email} already exists!`);
      process.exit();
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(NEW_GP_DETAILS.gp_password, 10);

    // 3. Save to database
    const newGp = new GP({
      ...NEW_GP_DETAILS,
      gp_password: hashedPassword
    });

    await newGp.save();
    console.log(`✅ Successfully registered Gram Panchayath: ${NEW_GP_DETAILS.gramPanchayat} (${NEW_GP_DETAILS.gp_email})`);

  } catch (error) {
    console.error("❌ Error creating GP:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

registerGP();