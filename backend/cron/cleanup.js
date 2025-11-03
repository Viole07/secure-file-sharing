// backend/cron/cleanup.js
const cron = require('node-cron');
const File = require('../models/File');
const cloudinary = require('../utils/cloudinary');

const startCleanupJob = () => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Checking for expired or overused files...');

    try {
      const now = new Date();
      const files = await File.find({
        isRevoked: false,
        $or: [
          { expiresAt: { $lte: now } },
          { $expr: { $gte: ['$currentDownloads', '$maxDownloads'] } }
        ]
      });

      if (files.length === 0) {
        console.log('[CRON] No files to clean up at this time.');
        return;
      }

      console.log(`[CRON] Found ${files.length} file(s) to process.`);

      for (const file of files) {
        try {
          // Use the stored resourceType (defaulting to 'raw' if not present)
          const resourceType = file.resourceType || 'raw';
          
          await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
            resource_type: resourceType // <-- USE THE CORRECT RESOURCE TYPE
          });
          
          file.isRevoked = true;
          await file.save();
          console.log(`[✔] Deleted file ${file.filename} (${file.cloudinaryPublicId}) from Cloudinary`);
        } catch (err) {
          console.error(`[✘] Failed to delete ${file.filename}:`, err.message);
        }
      }

      console.log(`[CRON] Cleanup completed.`);
    } catch (err) {
      console.error('[CRON ERROR] Failed to run cleanup:', err.message);
    }
  });
};

module.exports = startCleanupJob;