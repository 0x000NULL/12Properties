const { validateEnv, REQUIRED_VARS } = require('../config/environment');

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore process.env after each test
    process.env = originalEnv;
  });

  it('should detect missing required variables', () => {
    // Remove a required variable
    delete process.env.MONGODB_URI;
    
    // Should throw an error about missing variables
    expect(() => validateEnv()).toThrow();
  });

  it('should list all missing required variables', () => {
    // Remove multiple required variables
    delete process.env.MONGODB_URI;
    delete process.env.SESSION_SECRET;
    delete process.env.NODE_ENV;
    
    // Should throw an error listing all missing variables
    expect(() => validateEnv()).toThrow();
  });

  it('should validate correct environment variables', () => {
    // Set up valid environment variables
    process.env = {
      MONGODB_URI: 'mongodb://localhost:27017/test',
      SESSION_SECRET: 'a'.repeat(64),
      ALLOWED_ORIGINS: 'http://localhost:3000',
      NODE_ENV: 'test',
      HTTP_PORT: '3000',
      HTTPS_PORT: '3443',
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'true',
      SMTP_USER: 'test@test.com',
      SMTP_PASS: 'test-password',
      SMTP_FROM: 'noreply@test.com',
      BASE_URL: 'http://localhost:3000',
      RECAPTCHA_SITE_KEY: 'test-site-key',
      RECAPTCHA_SECRET_KEY: 'test-secret-key',
      RECAPTCHA_MIN_SCORE: '0.5',
      RECAPTCHA_ACTION: 'test',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      LOGIN_RATE_LIMIT_MAX: '5',
      SESSION_NAME: 'test-session',
      SESSION_MAX_AGE: '86400000'
    };

    // Should not throw an error
    expect(() => validateEnv()).not.toThrow();
  });

  it('should require SSL configuration in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'a'.repeat(64);
    // ... other required env vars ...

    // Should throw an error about missing SSL config
    expect(() => validateEnv()).toThrow('SSL configuration is required in production environment');
  });

  it('should validate MongoDB URI format', () => {
    process.env.MONGODB_URI = 'invalid-uri';
    // ... other required env vars ...

    expect(() => validateEnv()).toThrow('Invalid MongoDB URI format');
  });

  it('should validate session secret length', () => {
    process.env.SESSION_SECRET = 'too-short';
    // ... other required env vars ...

    expect(() => validateEnv()).toThrow('Session secret must be at least 64 characters');
  });

  it('should validate SMTP email format', () => {
    process.env.SMTP_USER = 'invalid-email';
    // ... other required env vars ...

    expect(() => validateEnv()).toThrow('Invalid SMTP username format');
  });

  it('should validate numeric values', () => {
    process.env.HTTP_PORT = 'invalid';
    // ... other required env vars ...

    expect(() => validateEnv()).toThrow();
  });

  it('should validate reCAPTCHA score range', () => {
    process.env.RECAPTCHA_MIN_SCORE = '2';
    // ... other required env vars ...

    expect(() => validateEnv()).toThrow();
  });

  it('should have all required variables defined in REQUIRED_VARS', () => {
    // Get all required variables from the schema
    const schemaVars = Object.keys(envSchema.shape);
    
    // Check if all schema variables are in REQUIRED_VARS
    schemaVars.forEach(varName => {
      expect(REQUIRED_VARS).toContain(varName);
    });
    
    // Check if all REQUIRED_VARS are in the schema
    REQUIRED_VARS.forEach(varName => {
      expect(schemaVars).toContain(varName);
    });
  });
}); 