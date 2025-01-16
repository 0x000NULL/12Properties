const csrf = require('csurf');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    if (req.is('multipart/form-data')) {
      return req.headers['csrf-token'];
    }
    return req.headers['csrf-token'] || req.body._csrf || req.query._csrf;
  }
});

// Wrap CSRF protection with better error handling
const protect = (req, res, next) => {
  if (!req.session) {
    console.error('No session available');
    return next(new Error('Session not available'));
  }

  console.log('\nCSRF Protection ----------------');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('CSRF Token source:', 
    req.headers['csrf-token'] ? 'headers' : 
    req.body?._csrf ? 'body' : 
    req.query._csrf ? 'query' : 'none'
  );
  console.log('--------------------------------\n');

  csrfProtection(req, res, (err) => {
    if (err) {
      console.error('CSRF Error:', err);
      if (err.code === 'EBADCSRFTOKEN') {
        console.error('Invalid CSRF token');
        console.error('Token received:', req.headers['csrf-token'] || req.body?._csrf || req.query._csrf);
        console.error('Session secret:', req.session.csrfSecret);
        
        return res.status(403).json({
          error: 'Security token expired. Please try again.',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      return next(err);
    }
    next();
  });
};

const skipCSRF = (req, res, next) => {
  next();
};

module.exports = {
  protect,
  skip: skipCSRF
}; 