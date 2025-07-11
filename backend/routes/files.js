const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const File = require('../models/File');
const sendEmail = require('../utils/sendEmail');
const QRCode = require('qrcode');

// 🟩 Route 1: Get Signed Upload URL
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

// 🟩 Route 2: Save file metadata + send OTP
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      filename,
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresInHours,
      maxDownloads,
      recipientEmail
    } = req.body;

    const uuid = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const file = await File.create({
      ownerId: req.userId,
      uuid,
      filename,
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxDownloads,
      otpHash,
      recipientEmail
    });

    const downloadLink = `http://localhost:3000/download/${uuid}`;

    if (recipientEmail) {
      await sendEmail(
        recipientEmail,
        'Your Secure File Download Link',
        `Use this link: ${downloadLink}\nOTP: ${otp}`
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


router.post('/verify-download/:uuid',authMiddleware,  async (req, res) => {
  const { uuid } = req.params;
  const { otp } = req.body;

  try {
    const file = await File.findOne({ uuid });

    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.isRevoked) return res.status(403).json({ message: 'Link has been revoked' });
    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      return res.status(410).json({ message: 'Link expired' });
    }
    if (file.currentDownloads >= file.maxDownloads) {
      return res.status(403).json({ message: 'Download limit reached' });
    }

    const isMatch = await bcrypt.compare(otp.toString(), file.otpHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid OTP' });

    // ✅ If all good, log + increment
    file.currentDownloads += 1;
    await file.save();

    res.json({ downloadUrl: file.cloudinaryUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all files uploaded by logged-in user
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Revoke and delete file by ID
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      ownerId: req.userId
    });

    if (!file) return res.status(404).json({ message: 'File not found' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.cloudinaryPublicId);

    // Mark as revoked
    file.isRevoked = true;
    await file.save();

    res.json({ message: 'File revoked and deleted from Cloudinary' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
