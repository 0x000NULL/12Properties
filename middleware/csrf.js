const csrf = require('csurf');

const csrfProtection = csrf({
  cookie: false,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  sessionKey: 'session',
  value: (req) => {
    // Always check query string first for multipart forms
    const queryToken = req.query._csrf;
    if (queryToken) {
      return queryToken;
    }

    // Then check other locations
    return (
      req.headers['x-csrf-token'] ||
      req.headers['csrf-token'] ||
      (req.body && req.body._csrf)
    );
  }
});

// Wrap CSRF protection with better error handling
const protect = (req, res, next) => {
  if (!req.session) {
    console.error('No session available');
    return next(new Error('Session not available'));
  }

  // Log incoming request details
  console.log('CSRF Check Details:');
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);
  console.log('Session:', req.session);

  csrfProtection(req, res, (err) => {
    if (err) {
      console.error('CSRF Error:', err);
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
          error: 'Security token expired. Please refresh and try again.'
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