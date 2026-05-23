const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'DRAWING'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  options: [{
    text: String,
    image: String,
    isCorrect: Boolean,
  }], // For MCQ
  correctAnswer: {
    type: String, // Can be text for short answer or explanation for drawing/long answer
  },
  imageHint: {
    type: String, // URL/Path to image if question has an image
  },
  marks: {
    type: Number,
    default: 1,
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 10,
  },
  questions: [questionSchema],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
