const express = require('express');
const router = express.Router();
const PropertyNotification = require('../models/PropertyNotification');
const Property = require('../models/Property');
const transporter = require('../config/mailer');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation middleware
const validateNotification = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('propertyId').custom(value => {
    if (value === 'coming-soon') return true;
    return mongoose.Types.ObjectId.isValid(value);
  }),
  body('phone').optional().trim()
];

// Opt-out route
router.get('/opt-out/:notificationId', async (req, res) => {
  try {
    const notification = await PropertyNotification.findById(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await PropertyNotification.findByIdAndDelete(req.params.notificationId);
    
    // Redirect to index page with success message
    res.redirect('/?optOutSuccess=true');
  } catch (error) {
    console.error('Opt-out error:', error);
    res.redirect('/?optOutError=true');
  }
});

router.post('/notify', validateNotification, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, propertyId, phone } = req.body;

    // Special handling for general "coming soon" notifications
    if (propertyId === 'coming-soon') {
      const notification = new PropertyNotification({
        name,
        email,
        propertyId: null,
        phone,
        type: 'general'
      });

      await notification.save();

      // Send confirmation email
      const mailOptions = {
        from: `"12 Properties" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Property Notification Confirmation',
        html: `
          <h2>Notification Confirmation</h2>
          <p>Hello ${name},</p>
          <p>Thank you for your interest! You will be notified when new properties become available.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            To opt out of future notifications, click here: 
            <a href="${process.env.BASE_URL}/notifications/opt-out/${notification._id}">Opt Out</a>
          </p>
        `
      };

      await transporter.sendMail(mailOptions);

      return res.json({ 
        success: true, 
        message: 'You will be notified when new properties become available' 
      });
    }

    // Regular property notification handling...
    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'Coming Soon') {
      return res.status(404).json({ 
        error: 'Property not found or not available for notifications' 
      });
    }

    // Create notification
    const notification = new PropertyNotification({
      name,
      email,
      propertyId,
      phone
    });

    await notification.save();

    // Send confirmation email
    const mailOptions = {
      from: `"12 Properties" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Property Notification Confirmation',
      html: `
        <h2>Notification Confirmation</h2>
        <p>You will be notified when ${property.title} becomes available.</p>
        <p>Property Details:</p>
        <ul>
          <li>Location: ${property.location}</li>
          <li>Price: $${property.price.toLocaleString()}</li>
        </ul>
        <hr>
        <p style="font-size: 12px; color: #666;">
          To opt out of future notifications, click here: 
          <a href="${process.env.BASE_URL}/notifications/opt-out/${notification._id}">Opt Out</a>
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'You will be notified when this property becomes available' 
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'You are already subscribed to notifications for this property' 
      });
    }
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to process notification request' });
  }
});

module.exports = router; 