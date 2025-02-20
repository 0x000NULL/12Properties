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
const mongoSanitize = require('express-mongo-sanitize');
const { protect: csrfProtection } = require('./middleware/csrf');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const { router: authRouter, isAuthenticated } = require('./routes/auth');
const manageRouter = require('./routes/manage');
const notificationsRouter = require('./routes/notifications');
const contactRouter = require('./routes/contact');

const app = express();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: '__sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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

// Initialize session
app.use(session(sessionConfig));

// Apply CSRF protection after session initialization
app.use(csrfProtection);

// Make CSRF token available to views
app.use((req, res, next) => {
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
    const uri = process.env.MONGODB_URI;
    
    // Initialize MongoDB session store
    const mongoStore = MongoStore.create({
      mongoUrl: uri,
      ttl: 24 * 60 * 60,
      touchAfter: 24 * 3600,
      autoRemove: 'native',
      // Add retry options for the store
      clientPromise: mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Reduce timeout to fail fast
        socketTimeoutMS: 45000, // How long to wait for operations
        family: 4, // Force IPv4
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        // Remove TLS options for local development
        tls: process.env.NODE_ENV === 'production',
        tlsInsecure: false
      }).then(() => mongoose.connection.getClient())
    });
    
    // Replace in-memory session store with MongoDB store
    app.set('sessionStore', mongoStore);
    sessionConfig.store = mongoStore;
    
    // Add connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });

    // Return the connection promise
    return mongoose.connection;
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
}

// Initialize database connection with retries
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

async function connectWithRetry(retryCount = 0) {
  try {
    await initializeDatabase();
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error(`Failed to connect to MongoDB (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_INTERVAL/1000} seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1), RETRY_INTERVAL);
    } else {
      console.error('Max retry attempts reached. Could not connect to MongoDB.');
      if (process.env.NODE_ENV === 'production') {
        console.error('Critical database error in production - shutting down');
        process.exit(1);
      } else {
        console.log('Development mode - continuing with in-memory session store');
      }
    }
  }
}

// Start the connection process
connectWithRetry();

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

// Routes (moved after all middleware)
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/manage', manageRouter);
app.use('/api', notificationsRouter);
app.use('/api', contactRouter);

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
