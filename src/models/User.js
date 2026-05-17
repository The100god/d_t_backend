const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  studentClass: {
    type: String, // e.g., '10th', '12th'
  },
  stream: {
    type: String, // e.g., 'Science', 'Commerce'
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student',
  },
  refreshToken: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
