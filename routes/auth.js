const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { protect: csrfProtection, setToken, skip: skipCSRF } = require('../middleware/csrf');

// Redirect from /login to /auth/login
router.get('/', function(req, res) {
  res.redirect('/auth/login');
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
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

// Login page - apply setToken middleware to ensure CSRF token is available
router.get('/login', setToken, function(req, res, next) {
  res.render('login', { 
    isLoggedIn: !!req.session?.user,
    user: req.session?.user || null,
    error: req.session.error,
    csrfToken: res.locals.csrfToken
  });
  // Clear any error messages after displaying them
  if (req.session) {
    delete req.session.error;
  }
});

// Login POST handler - apply CSRF protection
router.post('/login', csrfProtection, validateLogin, async function(req, res, next) {
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
    // Ensure _id is stored as string
    userObject._id = userObject._id.toString();
    req.session.user = userObject;
    
    res.redirect('/manage');
  } catch (error) {
    next(error);
  }
});

// Logout handler - skip CSRF for logout
router.post('/logout', skipCSRF, function(req, res, next) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    // Always redirect to login page
    res.redirect('/auth/login');
  });
});

module.exports = {
  router,
  isAuthenticated
}; 