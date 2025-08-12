import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Form Schema
// Form Schema
const formSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
   userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  description: String,
  headerImage: String,
  mode: { type: String, enum: ['survey', 'test'], default: 'survey' },
  questions: [{
    id: String,
    type: { type: String, enum: ['categorize', 'cloze', 'comprehension'], required: true },
    title: { type: String, required: true },
    description: String,
    image: String,
    points: { type: Number, default: 1 },
    items: [{ id: String, text: String, categoryId: String }],
    categories: [{ id: String, name: String, color: String }],
    text: String,
    blanks: [{ id: String, answer: String, hint: String }],
    passage: String,
    followUpQuestions: [{
      id: String,
      question: String,
      options: [{ id: String, text: String }],
      correctAnswer: String
    }]
  }],
  settings: {
    allowAnonymous: { type: Boolean, default: true },
    showResults: { type: Boolean, default: true }
    },
  isActive: { type: Boolean, default: true },
  shareId: { type: String, default: uuidv4, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Response Schema
const responseSchema = new mongoose.Schema({
  formId: {
    type: String,
    ref: 'Form',
    required: true
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  score: {
    type: Number,
    min: 0
  },
  maxScore: {
    type: Number,
    min: 0
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Reset Token Schema
const resetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes
userSchema.index({ email: 1 });
formSchema.index({ userId: 1 });
formSchema.index({ createdAt: -1 });
responseSchema.index({ formId: 1 });
responseSchema.index({ createdAt: -1 });
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model('User', userSchema);
export const Form = mongoose.model('Form', formSchema);
export const Response = mongoose.model('Response', responseSchema);
export const ResetToken = mongoose.model('ResetToken', resetTokenSchema);
