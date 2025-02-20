const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const transporter = require('../config/mailer');
const Property = require('../models/Property');

// Validation middleware
const validateContact = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('phone').optional().trim(),
  body('propertyId').isMongoId()
];

router.post('/contact-agent', validateContact, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, message, propertyId } = req.body;

    // Get property and realtor details
    const property = await Property.findById(propertyId).populate('realtor', 'name email');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Increment inquiry count immediately
    property.inquiries = (property.inquiries || 0) + 1;
    await property.save();

    // Send response immediately
    res.json({ 
      success: true, 
      message: 'Your message has been sent. The agent will contact you soon.' 
    });

    // Send emails asynchronously
    setImmediate(async () => {
      try {
        // Send email to realtor
        const mailOptions = {
          from: `"12 Properties" <${process.env.SMTP_FROM}>`,
          to: property.realtor.email,
          subject: `New Inquiry for ${property.title}`,
          html: `
            <h2>New Property Inquiry</h2>
            <p><strong>Property:</strong> ${property.title}</p>
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        };
        await transporter.sendMail(mailOptions);

        // Send confirmation email to inquirer
        const confirmationMail = {
          from: `"12 Properties" <${process.env.SMTP_FROM}>`,
          to: email,
          subject: 'Property Inquiry Confirmation',
          html: `
            <h2>Thank you for your inquiry</h2>
            <p>We have received your message about ${property.title} and forwarded it to the property agent.</p>
            <p>They will contact you shortly.</p>
            <p><strong>Your message:</strong></p>
            <p>${message}</p>
          `
        };
        await transporter.sendMail(confirmationMail);
      } catch (error) {
        console.error('Failed to send emails:', error);
      }
    });

  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router; 