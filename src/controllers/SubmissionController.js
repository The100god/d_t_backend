const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    let gainedMarks = 0;
    const processedAnswers = answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      let isCorrect = false;
      let gainedMarksForQuestion = 0;
      if (question.type === 'MCQ') {
        const correctOption = question.options.find(o => o.isCorrect);
        isCorrect = correctOption && correctOption._id.toString() === answer.optionId;
        if (isCorrect) gainedMarksForQuestion = question.marks || 1;
      } else if (question.type === 'SHORT_ANSWER') {
        isCorrect = question.correctAnswer?.toLowerCase().trim() === answer.textAnswer?.toLowerCase().trim();
        if (isCorrect) gainedMarksForQuestion = question.marks || 1;
      } else if (question.type === 'LONG_ANSWER') {
        const keywords = (question.correctAnswer || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const studentWords = (answer.textAnswer || '').toLowerCase();
        const matchedKeywords = keywords.filter(word => studentWords.includes(word));
        isCorrect = keywords.length > 0 && matchedKeywords.length >= keywords.length / 2;
        if (isCorrect) gainedMarksForQuestion = (question.marks || 1) * 0.5; // Half points for partial match
      }

      gainedMarks += gainedMarksForQuestion;

      return {
        ...answer,
        isCorrect,
        score: gainedMarksForQuestion,
        maxMarks: question.marks || 1,
        type: question.type,
      };
    });

    const submission = new Submission({
      quiz: quizId,
      student: req.user.userId,
      answers: processedAnswers,
      gainedMarks,
      totalMarks: quiz.totalMarks || quiz.questions.length,
      status: quiz.questions.some(q => q.type !== 'MCQ') ? 'pending' : 'graded',
    });

    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user.userId }).populate('quiz', 'title subject');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getQuizSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ quiz: req.params.quizId }).populate('student', 'email name studentClass stream');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('quiz', 'title subject questions')
      .populate('student', 'email name studentClass stream');
    
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    // Security check: Only the student who submitted or an admin can see this
    if (req.user.role !== 'admin' && submission.student._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId, questionId, isCorrect, score } = req.body;
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    const answer = submission.answers.find(a => a.questionId.toString() === questionId);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    // Update the gained marks based on the new grading
    const oldContribution = answer.score || 0;
    
    answer.isCorrect = isCorrect;
    // If teacher provides a score, use it. If marking correct without explicit score, use maxMarks.
    answer.score = score !== undefined ? score : (isCorrect ? (answer.maxMarks || 1) : 0);
    
    submission.gainedMarks = submission.gainedMarks - oldContribution + answer.score;
    
    const allGraded = submission.answers.every(a => a.type === 'MCQ' || a.isCorrect !== undefined);
    if (allGraded) submission.status = 'graded';

    await submission.save();
    res.json({ message: 'Grading updated successfully', submission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Authorization: Only the student who submitted it OR an admin (teacher) can delete it
    if (req.user.role !== 'admin' && submission.student.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this submission' });
    }

    await Submission.findByIdAndDelete(submissionId);
    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminAllSubmissions = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const Quiz = require('../models/Quiz');
    
    // Get all quizzes created by this admin (including soft-deleted ones)
    const quizzes = await Quiz.find({ creator: adminId });
    const quizIds = quizzes.map(q => q._id);

    // Get all submissions for these quizzes
    const submissions = await Submission.find({ quiz: { $in: quizIds } })
      .populate('quiz', 'title subject isDeleted')
      .populate('student', 'email name studentClass stream');

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importSubmissionsCSV = async (req, res) => {
  try {
    const { submissions } = req.body;
    if (!submissions || !Array.isArray(submissions)) {
      return res.status(400).json({ error: 'Invalid or missing submissions array.' });
    }

    const User = require('../models/User');
    const Quiz = require('../models/Quiz');

    const importedSubmissions = [];

    for (const item of submissions) {
      const { studentName, studentEmail, quizTitle, subject, score, status } = item;
      if (!studentEmail || !quizTitle) continue;

      // Find or create student
      let student = await User.findOne({ email: studentEmail.toLowerCase().trim() });
      if (!student) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('123456', 10);
        student = new User({
          email: studentEmail.toLowerCase().trim(),
          password: hashedPassword,
          name: studentName || studentEmail.split('@')[0],
          role: 'student',
        });
        await student.save();
      }

      // Find or create quiz created by this teacher
      let quiz = await Quiz.findOne({ 
        title: { $regex: new RegExp(`^${quizTitle.trim()}$`, 'i') },
        creator: req.user.userId
      });

      if (!quiz) {
        quiz = new Quiz({
          title: quizTitle.trim(),
          subject: subject || 'General',
          timeLimit: 30,
          totalMarks: 100,
          creator: req.user.userId,
          isPublic: false,
          isDeleted: true, // Mark as soft-deleted/archived
          questions: [{
            type: 'SHORT_ANSWER',
            text: 'Imported Question',
            marks: 100
          }]
        });
        await quiz.save();
      }

      const parsedGained = parseFloat(score) || 0;
      const submission = new Submission({
        quiz: quiz._id,
        student: student._id,
        answers: [],
        gainedMarks: parsedGained,
        totalMarks: quiz.totalMarks || 100,
        status: status || 'graded',
      });
      await submission.save();
      importedSubmissions.push(submission);
    }

    res.json({ message: `Successfully imported ${importedSubmissions.length} student records!`, count: importedSubmissions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
