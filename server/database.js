import mongoose from 'mongoose';

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
const formSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  headerImage: {
    type: String
  },
  mode: {
    type: String,
    enum: ['survey', 'test'],
    default: 'survey'
  },
  questions: [{
    id: String,
    type: {
      type: String,
      enum: ['categorize', 'cloze', 'comprehension'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    image: String,
    points: {
      type: Number,
      default: 1,
      min: 1
    },
    // Categorize specific
    items: [String],
    categories: [{
      name: String,
      items: [String]
    }],
    correctAnswer: mongoose.Schema.Types.Mixed,
    // Cloze specific
    text: String,
    blanks: Number,
    // Comprehension specific
    passage: String,
    followUpQuestions: [{
      question: String,
      options: [String],
      correctAnswer: String
    }]
  }],
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    timeLimit: Number
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
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