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

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const { router: authRouter, isAuthenticated } = require('./routes/auth');
const manageRouter = require('./routes/manage');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Basic middleware setup
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(expressSanitizer());
app.use(xssClean());
app.use(express.static(path.join(__dirname, 'public')));

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
        "'unsafe-eval'"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

// Session configuration with in-memory store for development
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
};

// Initialize with in-memory session store
app.use(session(sessionConfig));

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
    let dbName = '12properties';
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
    
    // Create MongoDB session store
    const mongoStore = MongoStore.create({
      mongoUrl: uri,
      ttl: 24 * 60 * 60 // Session TTL (1 day)
    });
    
    // Update session middleware with MongoDB store
    app.use(session({
      ...sessionConfig,
      store: mongoStore
    }));
    
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
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
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
