const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const User = require('../models/User');

// Get Recipient Public Key by Email
router.get('/recipient-key/:email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: 'Recipient not found' });
    res.json({ publicKey: user.publicKey });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/upload-url', authMiddleware, (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: 'secure_uploads' },
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp, signature, folder: 'secure_uploads',
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { 
      filename, fileType, cloudinaryUrl, cloudinaryPublicId, 
      expiresInHours, maxDownloads, recipientPublicKey, 
      senderEphemeralPublicKey, iv 
    } = req.body;

    const uuid = uuidv4();
    const file = new File({
      ownerId: req.userId,
      uuid, filename, fileType, cloudinaryUrl, cloudinaryPublicId,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxDownloads,
      senderEphemeralPublicKey,
      recipientPublicKey,
      iv
    });
    await file.save();
    res.json({ uuid, downloadLink: `http://localhost:5173/download/${uuid}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-download/:uuid', authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({ uuid: req.params.uuid });
    if (!file || file.isRevoked) return res.status(404).json({ message: 'Invalid or revoked link' });
    
    // Check expiry and download limits [cite: 30, 31]
    if (new Date() > file.expiresAt || file.currentDownloads >= file.maxDownloads) {
        return res.status(403).json({ message: 'Link expired or limit reached' });
    }

    file.currentDownloads += 1;
    await file.save();

    res.json({
      encryptedFile: file.cloudinaryUrl,
      filename: file.filename,
      fileType: file.fileType,
      senderEphemeralPublicKey: file.senderEphemeralPublicKey,
      iv: file.iv
    });
  } catch (err) {
    res.status(500).json({ message: 'Verification error' });
  }
});

// Reuse existing /mine and /delete/:id routes...
module.exports = router;