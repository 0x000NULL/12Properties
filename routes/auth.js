const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Login page
router.get('/login', function(req, res, next) {
  res.render('login', { 
    isLoggedIn: !!req.session.user,
    user: req.session.user || null,
    error: req.session.error
  });
  // Clear any error messages after displaying them
  delete req.session.error;
});

// Login POST handler
router.post('/login', validateLogin, async function(req, res, next) {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.error = errors.array()[0].msg;
      return res.redirect('/auth/login');
    }

    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      req.session.error = 'Invalid email or password';
      return res.redirect('/auth/login');
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      req.session.error = 'Invalid email or password';
      return res.redirect('/auth/login');
    }

    // Store user in session (excluding password)
    const userObject = user.toObject();
    delete userObject.password;
    req.session.user = userObject;
    
    res.redirect('/manage');
  } catch (error) {
    next(error);
  }
});

// Logout handler
router.post('/logout', function(req, res, next) {
  req.session.destroy((err) => {
    if (err) {
      next(err);
    } else {
      res.redirect('/auth/login');
    }
  });
});


module.exports = {
  router,
  isAuthenticated
}; 