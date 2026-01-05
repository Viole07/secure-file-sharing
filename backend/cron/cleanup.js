const cron = require('node-cron');
const File = require('../models/File');
const cloudinary = require('../utils/cloudinary');

const startCleanupJob = () => {
  // Run every 10 minutes to ensure "Right to be Forgotten"
  cron.schedule('*/10 * * * *', async () => {
    console.log('[SHREDDER] Scanning for expired keys...');
    try {
      const now = new Date();
      // Find files that are expired OR over limit OR manually revoked but still on Cloudinary
      const filesToShred = await File.find({
        isRevoked: false,
        $or: [
          { expiresAt: { $lte: now } },
          { $expr: { $gte: ['$currentDownloads', '$maxDownloads'] } }
        ]
      });

      for (const file of filesToShred) {
        // 1. Delete the blob from Cloudinary
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: 'raw' });
        
        // 2. Mark as revoked and delete metadata (The Crypto-Shred)
        file.isRevoked = true;
        file.senderEphemeralPublicKey = null; // Remove the mathematical path
        file.iv = null; 
        await file.save();
        
        console.log(`[✔] Shredded: ${file.filename}`);
      }
    } catch (err) {
      console.error('[SHREDDER ERROR]', err.message);
    }
  });
};

module.exports = startCleanupJob;