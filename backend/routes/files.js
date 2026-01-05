const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const User = require('../models/User');

// 1. Get Recipient Public Key by Email
router.get('/recipient-key/:email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: 'Recipient not found' });
    res.json({ publicKey: user.publicKey });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Save metadata with Policy Enforcement
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
      uuid, 
      filename, 
      fileType, 
      cloudinaryUrl, 
      cloudinaryPublicId,
      // Condition 1: Expiry based on user input
      expiresAt: new Date(Date.now() + parseInt(expiresInHours) * 60 * 60 * 1000),
      // Condition 2: Download Limit
      maxDownloads: parseInt(maxDownloads),
      senderEphemeralPublicKey,
      recipientPublicKey,
      iv
    });
    
    await file.save();
    res.json({ uuid, downloadLink: `http://localhost:5173/download/${uuid}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error saving metadata' });
  }
});

// 3. Verify Download with 3-Condition Logic
router.post('/verify-download/:uuid', authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({ uuid: req.params.uuid });
    if (!file || file.isRevoked) return res.status(404).json({ message: 'Invalid or shredded link' });
    
    // Check Expiry
    if (new Date() > file.expiresAt) {
        return res.status(403).json({ message: 'This file has expired and been shredded.' });
    }

    // Check Download Limit
    if (file.currentDownloads >= file.maxDownloads) {
        return res.status(403).json({ message: 'Download limit reached. Access shredded.' });
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

// 4. Manual Revoke (User triggered shredding)
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: 'raw' });

    file.isRevoked = true;
    file.senderEphemeralPublicKey = null; // Key Metadata shredded [cite: 29]
    file.iv = null;
    await file.save();

    res.json({ message: 'File shredded successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error during manual shredding' });
  }
});

// 5. Fetch user's files for Dashboard
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;