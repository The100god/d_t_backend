const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/SubmissionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const multer = require('multer');
const { uploadImage } = require('../utils/cloudinary');

// Use memory storage for Cloudinary streaming uploads
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 25MB limit
});

router.post('/', authMiddleware, SubmissionController.submitQuiz);
router.get('/my-submissions', authMiddleware, SubmissionController.getStudentSubmissions);
router.get('/quiz/:quizId', authMiddleware, adminMiddleware, SubmissionController.getQuizSubmissions);
router.get('/admin/all-submissions', authMiddleware, adminMiddleware, SubmissionController.getAdminAllSubmissions);
router.post('/admin/import-csv', authMiddleware, adminMiddleware, SubmissionController.importSubmissionsCSV);
router.get('/:id', authMiddleware, SubmissionController.getSubmissionById);
router.post('/grade', authMiddleware, adminMiddleware, SubmissionController.gradeSubmission);
router.delete('/:id', authMiddleware, SubmissionController.deleteSubmission);

// File upload endpoint for answers or quiz questions (Cloudinary with local fallback)
router.post('/upload', authMiddleware, memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await uploadImage(req.file.buffer, req.file.originalname);
    res.json({ imageUrl: result.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
