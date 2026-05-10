const express = require('express');
const router = express.Router();
const QuizController = require('../controllers/QuizController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', QuizController.getAllQuizzes);
router.get('/admin/stats', authMiddleware, adminMiddleware, QuizController.getAdminStats);
router.get('/:id', QuizController.getQuizById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, QuizController.createQuiz);
router.get('/admin/my-quizzes', authMiddleware, adminMiddleware, QuizController.getAdminQuizzes);
router.delete('/:id', authMiddleware, adminMiddleware, QuizController.deleteQuiz);

module.exports = router;
