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
});

// Verify transporter
transporter.verify(function (error, success) {
  if (error) {
    console.log('Error verifying mail server:', error);
  } else {
    console.log('Mail server is ready to send messages');
  }
});

module.exports = transporter; 