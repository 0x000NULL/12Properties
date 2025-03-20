// Set test environment
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Mock nodemailer
jest.mock('../config/mailer', () => require('./mocks/mailer'));

// Additional test environment variables
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-password';
process.env.MAIL_FROM = 'test@test.com';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}; 