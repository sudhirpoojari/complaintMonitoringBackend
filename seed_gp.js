require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const GP = require("./model/gp");

const URI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/complaint";

// Read details from command-line arguments, environment variables, or fallbacks
const NEW_GP_DETAILS = {
  gp_email: process.argv[2] || process.env.SEED_GP_EMAIL || "gp_mysore1@example.com",
  gp_password: process.argv[3] || process.env.SEED_GP_PASSWORD || "securepassword123",
  state: process.argv[4] || process.env.SEED_GP_STATE || "Karnataka",
  district: process.argv[5] || process.env.SEED_GP_DISTRICT || "Mysore",
  taluk: process.argv[6] || process.env.SEED_GP_TALUK || "Mysore",
  gramPanchayat: process.argv[7] || process.env.SEED_GP_NAME || "GP1"
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