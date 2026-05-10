const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/SubmissionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authMiddleware, SubmissionController.submitQuiz);
router.get('/my-submissions', authMiddleware, SubmissionController.getStudentSubmissions);
router.get('/quiz/:quizId', authMiddleware, adminMiddleware, SubmissionController.getQuizSubmissions);
router.get('/:id', authMiddleware, SubmissionController.getSubmissionById);
router.post('/grade', authMiddleware, adminMiddleware, SubmissionController.gradeSubmission);

// File upload endpoint for answers or quiz questions
router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;
