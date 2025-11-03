// backend/models/File.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uuid: { type: String, unique: true },
  filename: String,
  fileType: String, // <-- ADD THIS LINE
  resourceType: { type: String, default: 'raw' },
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  expiresAt: Date,
  maxDownloads: Number,
  currentDownloads: { type: Number, default: 0 },
  otpHash: String,
  recipientEmail: String,
  isRevoked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);