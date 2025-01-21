require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const xssClean = require('xss-clean');
const expressSanitizer = require('express-sanitizer');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { protect: csrfProtection } = require('./middleware/csrf');
const mongoSanitize = require('express-mongo-sanitize');
const debugCsrf = require('./middleware/debugCsrf');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const { router: authRouter, isAuthenticated } = require('./routes/auth');
const manageRouter = require('./routes/manage');

const app = express();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: '__sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  rolling: true,
  unset: 'destroy'
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Basic middleware setup
app.use(logger('dev'));
app.use(express.json({ limit: '100gb' }));
app.use(express.urlencoded({ extended: true, limit: '100gb' }));
app.use(cookieParser());
app.use(expressSanitizer());
app.use(xssClean());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize with in-memory session store first (will be replaced with MongoDB store if connection succeeds)
app.use(session(sessionConfig));

// Apply CSRF protection after session middleware
app.use(csrfProtection);

// Add CSRF token to all responses
app.use((req, res, next) => {
  if (!req.session) {
    return next(new Error('Session not available'));
  }
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Add more specific rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

// Increase timeout
app.use((req, res, next) => {
  res.setTimeout(24 * 60 * 60 * 1000); // 24 hour timeout
  next();
});

// MongoDB Connection
async function initializeDatabase() {
  try {
    // First, check if database already exists with any case
    const adminClient = await mongoose.connect('mongodb://127.0.0.1:27017/admin', {
      family: 4
    });
    
    const adminDb = adminClient.connection.db;
    const databases = await adminDb.admin().listDatabases();
    const dbExists = databases.databases.some(
      db => db.name.toLowerCase() === '12properties'
    );
    
    // Disconnect from admin database
    await mongoose.disconnect();
    
    // Connect to the correct database, using existing one if found
    let dbName = '12Properties';
    if (dbExists) {
      // Find the actual name with correct case
      dbName = databases.databases.find(
        db => db.name.toLowerCase() === '12properties'
      ).name;
      console.log(`Found existing database: ${dbName}`);
    }
    
    // Update the connection URI with the correct database name
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    console.log(`Connecting to database: ${dbName}`);
    
    // Initialize MongoDB session store with correct database name
    const mongoStore = MongoStore.create({
      mongoUrl: uri,
      ttl: 24 * 60 * 60,
      touchAfter: 24 * 3600,
      autoRemove: 'native'
    });
    
    // Replace in-memory session store with MongoDB store
    app.set('sessionStore', mongoStore);
    sessionConfig.store = mongoStore;
    
    return mongoose.connect(uri, {
      family: 4
    });
  } catch (err) {
    console.error('Database initialization error:', err.message);
    if (err.code === 13297) {
      console.log('\nDatabase case sensitivity issue detected.');
      console.log('Please follow these steps to resolve:');
      console.log('1. Open MongoDB shell: mongosh');
      console.log('2. Switch to the database: use 12Properties');
      console.log('3. Drop the database: db.dropDatabase()');
      console.log('4. Exit MongoDB shell: exit');
      console.log('5. Restart the application\n');
    }
    throw err;
  }
}

// Initialize database connection
initializeDatabase()
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('Failed to initialize database');
    if (process.env.NODE_ENV === 'production') {
      console.error('Critical database error in production - shutting down');
      process.exit(1);
    } else {
      console.log('Development mode - using in-memory session store');
    }
  });

// Add this to handle MongoDB errors globally
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
  if (err.code === 13297) {
    console.log('\nDatabase case sensitivity issue detected.');
    console.log('Please follow these steps to resolve:');
    console.log('1. Open MongoDB shell: mongosh');
    console.log('2. Switch to the database: use 12Properties');
    console.log('3. Drop the database: db.dropDatabase()');
    console.log('4. Exit MongoDB shell: exit');
    console.log('5. Restart the application\n');
  }
});

// Handle application shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// Add preload headers for critical resources
app.use((req, res, next) => {
  res.setHeader('Link', [
    '<https://fonts.googleapis.com>; rel=preconnect; crossorigin',
    '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
    '<https://cdnjs.cloudflare.com>; rel=preconnect; crossorigin'
  ].join(', '));
  next();
});

// Prevent NoSQL injection
app.use(mongoSanitize());

// Add additional sanitization
app.use((req, res, next) => {
  // Sanitize req.body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
});

// Add debug middleware in development
if (process.env.NODE_ENV !== 'production') {
  app.use(debugCsrf);
}

// Routes (moved after all middleware)
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/manage', manageRouter);

// Redirect /login to /auth/login
app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Don't leak error details in production
  const error = req.app.get('env') === 'development' ? err : {};
  
  // render the error page
  res.status(err.status || 500);
  res.render('error', { error });
});

module.exports = app;
