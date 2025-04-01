const { z } = require('zod');

// Define required environment variables
const REQUIRED_VARS = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'ALLOWED_ORIGINS',
  'NODE_ENV',
  'HTTP_PORT',
  'HTTPS_PORT',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'BASE_URL',
  'RECAPTCHA_SITE_KEY',
  'RECAPTCHA_SECRET_KEY',
  'RECAPTCHA_MIN_SCORE',
  'RECAPTCHA_ACTION',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'LOGIN_RATE_LIMIT_MAX',
  'SESSION_NAME',
  'SESSION_MAX_AGE'
];

// Define the environment schema
const envSchema = z.object({
  // Database Configuration
  MONGODB_URI: z.string().url('Invalid MongoDB URI format'),
  
  // Security
  SESSION_SECRET: z.string().min(64, 'Session secret must be at least 64 characters'),
  ALLOWED_ORIGINS: z.string().transform(val => val.split(',')),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']),
  HTTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  HTTPS_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  
  // SSL Configuration (Required for production)
  SSL_KEY_PATH: z.string().optional(),
  SSL_CERT_PATH: z.string().optional(),
  SSL_CHAIN_PATH: z.string().optional(),
  
  // SMTP Configuration
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  SMTP_SECURE: z.string().transform(val => val === 'true'),
  SMTP_USER: z.string().min(1, 'Invalid SMTP username format'),
  SMTP_PASS: z.string().min(1, 'SMTP password is required'),
  SMTP_FROM: z.string().email('Invalid SMTP from address format'),
  
  // Application
  BASE_URL: z.string().url('Invalid base URL format'),
  
  // reCAPTCHA Configuration
  RECAPTCHA_SITE_KEY: z.string().min(1, 'reCAPTCHA site key is required'),
  RECAPTCHA_SECRET_KEY: z.string().min(1, 'reCAPTCHA secret key is required'),
  RECAPTCHA_MIN_SCORE: z.string().transform(Number).pipe(z.number().min(0).max(1)),
  RECAPTCHA_ACTION: z.string(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()),
  LOGIN_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().positive()),
  
  // Session Configuration
  SESSION_NAME: z.string(),
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number().int().positive())
});

// Check for missing required variables
function checkMissingRequiredVars() {
  const missingVars = REQUIRED_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`- ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Validate environment variables
function validateEnv() {
  try {
    // First check for missing required variables
    checkMissingRequiredVars();
    
    const validatedEnv = envSchema.parse(process.env);
    
    // Additional validation for production environment
    if (validatedEnv.NODE_ENV === 'production') {
      if (!validatedEnv.SSL_KEY_PATH || !validatedEnv.SSL_CERT_PATH || !validatedEnv.SSL_CHAIN_PATH) {
        throw new Error('SSL configuration is required in production environment');
      }
    }
    
    // Log successful validation
    console.log('Environment validation successful');
    console.log('Running in:', validatedEnv.NODE_ENV, 'mode');
    
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Environment validation error:', error.message);
    }
    process.exit(1);
  }
}

module.exports = {
  validateEnv,
  REQUIRED_VARS
}; 