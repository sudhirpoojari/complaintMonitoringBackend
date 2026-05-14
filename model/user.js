// models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: Number,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    taluk: {
        type: String,
        required: true
    },
    gramPanchayat: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Export model
module.exports = mongoose.model("User", userSchema);