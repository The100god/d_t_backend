const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');

// Configure multer memory storage for streaming to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Protect all media routes (teachers and admins only)
router.use(authMiddleware, adminMiddleware);

router.get('/', mediaController.getAllMedia);
router.post('/upload', upload.single('image'), mediaController.uploadMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
