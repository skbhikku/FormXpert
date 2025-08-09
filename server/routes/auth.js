import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Rate limiters
const loginLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
});

const registerLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 3600, // per hour
});

// Register
router.post('/register', async (req, res) => {
  try {
    await registerLimiter.consume(req.ip);
    
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    res.status(429).json({ error: 'Too many registration attempts' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    await loginLimiter.consume(req.ip);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(429).json({ error: 'Too many login attempts' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;