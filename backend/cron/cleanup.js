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

      for (const file of files) {
        try {
          await cloudinary.uploader.destroy(file.cloudinaryPublicId);
          file.isRevoked = true;
          await file.save();
          console.log(`[✔] Deleted file ${file.filename} from Cloudinary`);
        } catch (err) {
          console.error(`[✘] Failed to delete ${file.filename}:`, err.message);
        }
      }

      console.log(`[CRON] Cleanup completed. Files processed: ${files.length}`);
    } catch (err) {
      console.error('[CRON ERROR] Failed to run cleanup:', err.message);
    }
  });
};

module.exports = startCleanupJob;
