const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  publicKey: { type: String, required: true }, // [cite: 52]
  wrappedPrivateKey: { type: String, required: true }, // [cite: 6]
  keySalt: { type: String, required: true } // [cite: 18]
}, { timestamps: true });

// Ensure this exact line is at the bottom
module.exports = mongoose.model('User', UserSchema);