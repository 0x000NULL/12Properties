const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256',
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100
});

// Verify transporter
transporter.verify(function (error, success) {
  if (error) {
    console.log('Error verifying mail server:', error);
    console.log('Detailed error:', error.message);
  } else {
    console.log('Mail server is ready to send messages');
  }
});

module.exports = transporter; 