const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    type: { type: String },
    optionId: String, // Added for MCQs
    textAnswer: String,
    imageAnswer: String, // URL/Path to uploaded image
    isCorrect: Boolean,
    score: Number,
    maxMarks: Number,
  }],
  gainedMarks: {
    type: Number,
    default: 0,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'graded'],
    default: 'pending',
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
