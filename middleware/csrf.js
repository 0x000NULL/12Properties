const csrf = require('csurf');

const csrfProtection = csrf({
  cookie: true,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    return (
      req.body._csrf ||
      req.query._csrf ||
      req.headers['csrf-token'] ||
      req.headers['x-csrf-token']
    );
  }
});

// Wrap CSRF protection with better error handling
const protect = (req, res, next) => {
  csrfProtection(req, res, (err) => {
    if (err) {
      if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF Error:', {
          url: req.url,
          method: req.method,
          token: req.body._csrf,
          headers: req.headers
        });
        
        // For GET requests, continue with new token
        if (req.method === 'GET') {
          return next();
        }
        
        // For POST requests, return to form with error
        return res.status(403).render('index', {
          title: 'Luxury Estates | Premium Properties',
          properties: [],
          user: req.session.user || null,
          csrfToken: req.csrfToken(),
          contactError: 'Form submission failed. Please try again.'
        });
      }
      return next(err);
    }
    next();
  });
};

// Debug middleware
const debugCsrf = (req, res, next) => {
  console.log('\nCSRF Protection ----------------');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Session ID:', req.sessionID);
  console.log('Headers:', req.headers);
  if (typeof req.csrfToken === 'function') {
    console.log('CSRF Token:', req.csrfToken());
  } else {
    console.log('CSRF Token: Not available');
  }
  console.log('--------------------------------\n');
  next();
};

module.exports = {
  protect,
  debugCsrf,
  skip: (req, res, next) => next()
}; 