const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uuid: { type: String, unique: true },
  filename: String,
  fileType: String,
  resourceType: { type: String, default: 'raw' },
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  expiresAt: Date,
  maxDownloads: Number,
  currentDownloads: { type: Number, default: 0 },
  senderEphemeralPublicKey: String, // Ephemeral ECC key for this specific file [cite: 25]
  recipientPublicKey: String, // Target user's identity public key
  iv: String, // Initialization Vector for AES-GCM [cite: 44]
  isRevoked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);