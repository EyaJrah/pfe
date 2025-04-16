const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// 🔹 Signup Route
router.post('/signup',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').not().isEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      console.log('Signup request received:', { ...req.body, password: '[REDACTED]' });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('Email already taken:', email);
        return res.status(400).json({ error: 'Email is already taken' });
      }

      // Create new user
      const newUser = new User({ name, email, password });
      await newUser.save();
      console.log('User created successfully:', { name, email });

      // Generate token
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      res.status(201).json({ 
        message: '✅ User created successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email
        }
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Server error during signup' });
    }
  }
);

// 🔹 Login Route
router.post('/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').not().isEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      console.log('Login request received:', { email: req.body.email });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log('Invalid password for user:', email);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('Login successful for user:', email);

      res.json({ 
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// 🔹 Protected Route - Get User Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile request received for user ID:', req.user.userId);
    
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      console.log('User not found for ID:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Profile retrieved successfully for user:', user.email);
    res.json(user);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

module.exports = router;