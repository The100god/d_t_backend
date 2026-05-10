const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

exports.createQuiz = async (req, res) => {
  try {
    const quiz = new Quiz({
      ...req.body,
      creator: req.user.userId,
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublic: true }).select('title subject timeLimit creator');
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // SECURITY: Remove correct answers for students
    const studentQuiz = quiz.toObject();
    studentQuiz.questions = studentQuiz.questions.map(q => {
      const { correctAnswer, ...rest } = q;
      if (q.type === 'MCQ') {
        rest.options = q.options.map(o => ({ text: o.text, _id: o._id }));
      }
      return rest;
    });

    res.json(studentQuiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user.userId });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, creator: req.user.userId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found or unauthorized' });
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getAdminStats = async (req, res) => {
  try {
    const adminId = req.user.userId;
    
    // Get all quizzes by this admin
    const quizzes = await Quiz.find({ creator: adminId });
    const quizIds = quizzes.map(q => q._id);

    // Get all submissions for these quizzes
    const submissions = await Submission.find({ quiz: { $in: quizIds } });

    // Total unique participants
    const participants = new Set(submissions.map(s => s.student.toString()));
    
    // Completion rate
    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    const totalSubmissions = submissions.length;
    const completionRate = totalSubmissions > 0 ? Math.round((gradedCount / totalSubmissions) * 100) : 0;

    res.json({
      totalQuizzes: quizzes.length,
      totalParticipants: participants.size,
      completionRate,
      totalSubmissions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
