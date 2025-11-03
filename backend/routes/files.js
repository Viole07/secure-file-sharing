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


// 🟩 Route 2: Save file metadata
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      filename,
      fileType,
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresInHours,
      maxDownloads,
      recipientEmail,
      otp
    } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const uuid = uuidv4();
    const otpHash = await bcrypt.hash(otp, 10);

    const file = new File({
      ownerId: req.userId,
      uuid,
      filename,
      fileType,
      cloudinaryUrl,
      cloudinaryPublicId,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
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
    
    // Validation check for corrupted data
    if (!file.filename || !file.fileType) {
      console.error(`[CORRUPTED DATA] File with UUID ${uuid} is missing filename or fileType.`);
      return res.status(500).json({ message: 'File record is corrupted. Please re-upload.' });
    }

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
    
    res.json({
        encryptedFile: file.cloudinaryUrl,
        filename: file.filename,
        fileType: file.fileType
    });
  } catch (err) {
    console.error(err);
// Note: The diff view showed a -/+ on the same line, which is just a formatting quirk.
   res.status(500).json({ message: 'Server error during verification' });
  }
});


// 🔽🔽🔽 THESE ARE THE MISSING ROUTES 🔽🔽🔽

// 🟩 Route 4: Get all files for the logged-in user
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    // Find all files where ownerId matches the logged-in user's ID
    const files = await File.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error('Error fetching user files:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// 🟩 Route 5: Revoke and delete a file
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      ownerId: req.userId // Ensure only the owner can delete
    });

    if (!file) return res.status(404).json({ message: 'File not found or unauthorized' });

    // Delete from Cloudinary first
    await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
      resource_type: 'raw' // Important: specify 'raw'
    });

    // Mark as revoked in the database (or you could delete it)
    file.isRevoked = true;
    await file.save();

    res.json({ message: 'File revoked and deleted from Cloudinary' });
  } catch (err) {
    console.error('Error revoking file:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔼🔼🔼 END OF NEW ROUTES 🔼🔼🔼


module.exports = router;

