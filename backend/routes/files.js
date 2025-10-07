// routes/files.js
const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const File = require('../models/File');
const sendEmail = require('../utils/sendEmail');
const QRCode = require('qrcode');

// ... (Your /upload-url route remains the same) ...
router.get('/upload-url', authMiddleware, (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: 'secure_uploads',
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: 'secure_uploads',
  });
});


// 🟩 Route 2: Save file metadata
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      filename,
      fileType, // <-- Receive fileType
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresInHours,
      maxDownloads,
      recipientEmail,
      otp // <-- Receive OTP from client
    } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const uuid = uuidv4();
    const otpHash = await bcrypt.hash(otp, 10); // Hash the received OTP

    const file = new File({
      ownerId: req.userId,
      uuid,
      filename,
      fileType, // <-- Save fileType
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxDownloads,
      otpHash,
      recipientEmail,
    });
    await file.save();

    const downloadLink = `http://localhost:3000/download/${uuid}`;

    if (recipientEmail) {
      await sendEmail(
        recipientEmail,
        'Your Secure File Download Link',
        `Use this link: ${downloadLink}\nYour OTP is: ${otp}`
      );
      return res.json({ message: 'Link emailed successfully' });
    } else {
      const qr = await QRCode.toDataURL(downloadLink);
      return res.json({ uuid, otp, downloadLink, qr });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🟩 Route 3: Verify and provide download URL
router.post('/verify-download/:uuid', authMiddleware, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { otp } = req.body;

    const file = await File.findOne({ uuid });

    if (!file) return res.status(404).json({ message: 'File not found or link is invalid' });
    if (file.isRevoked) return res.status(403).json({ message: 'This link has been revoked' });
    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      return res.status(410).json({ message: 'This link has expired' });
    }
    if (file.currentDownloads >= file.maxDownloads) {
      return res.status(403).json({ message: 'The download limit for this file has been reached' });
    }

    const isMatch = await bcrypt.compare(otp, file.otpHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid OTP provided' });

    file.currentDownloads += 1;
    await file.save();
    
    // Send back the necessary info for decryption
    res.json({
        encryptedFile: file.cloudinaryUrl,
        filename: file.filename,
        fileType: file.fileType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// ... (Your other routes: /mine, /delete/:id) ...

module.exports = router;