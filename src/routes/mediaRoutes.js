const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');

// Configure multer memory storage for streaming to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 25MB limit
});

// Protect all media routes (teachers and admins only)
router.use(authMiddleware, adminMiddleware);

router.get('/', mediaController.getAllMedia);
router.post('/upload', upload.any(), mediaController.uploadMedia);
router.post('/delete-bulk', mediaController.deleteMediaBulk);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
