const { doubleCsrf } = require('csrf-csrf');

// Configure cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
};

// Create CSRF configuration
const csrfConfig = doubleCsrf({
  getSecret: (req) => req.session?.csrfSecret,
  secret: process.env.CSRF_SECRET || 'your-secret-key',
  cookieName: 'x-csrf-token',
  cookieOptions,
  size: 64,
  getTokenFromRequest: (req) => {
    return (
      req.body?._csrf ||
      req.query?._csrf ||
      req.headers['csrf-token'] ||
      req.headers['x-csrf-token']
    );
  }
});

// Extract functions from configuration
const { generateToken, doubleCsrfProtection } = csrfConfig;

// Wrap CSRF protection with better error handling
const protect = (req, res, next) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    // Generate and set token for GET requests
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = require('crypto').randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = generateToken(req, res);
    return next();
  }

  try {
    doubleCsrfProtection(req, res, (err) => {
      if (err) {
        console.error('CSRF Error:', {
          method: req.method,
          url: req.url,
          body: req.body,
          headers: req.headers
        });
        return res.status(403).render('error', {
          message: 'Invalid CSRF token',
          error: { status: 403 }
        });
      }
      next();
    });
  } catch (error) {
    console.error('CSRF Protection Error:', error);
    next(error);
  }
};

// Debug middleware
const debugCsrf = (req, res, next) => {
  console.log('\nCSRF Debug ----------------');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Session ID:', req.sessionID);
  console.log('CSRF Secret:', req.session?.csrfSecret ? 'Present' : 'Missing');
  console.log('CSRF Token:', res.locals.csrfToken || 'Not set');
  console.log('Request Token:', req.body?._csrf || req.query?._csrf || req.headers['csrf-token'] || 'None');
  console.log('------------------------\n');
  next();
};

// Generate token middleware
const setToken = (req, res, next) => {
  try {
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = require('crypto').randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = generateToken(req, res);
    next();
  } catch (error) {
    console.error('Token Generation Error:', error);
    next(error);
  }
};

module.exports = {
  protect,
  debugCsrf,
  setToken,
  generateToken,
  skip: (req, res, next) => next()
}; 