var express = require('express');
var router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const transporter = require('../config/mailer');
const csrf = require('csurf');
const NodeCache = require('node-cache');
const axios = require('axios');

// Add CSRF protection
const csrfProtection = csrf({ cookie: true });

const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Helper function to get properties with caching
async function getFeaturedProperties() {
  const cacheKey = 'featured_properties';
  let properties = cache.get(cacheKey);
  
  if (!properties) {
    const docs = await Property.find({ status: 'Active' })
      .sort({ createdAt: -1 })
      .limit(6);
    
    // Convert mongoose documents to plain objects before caching
    properties = docs.map(doc => doc.toObject());
    cache.set(cacheKey, properties);
  }
  
  return properties;
}

// Add this function if you need to clear the cache
function clearPropertiesCache() {
  cache.del('featured_properties');
}

// Verify reCAPTCHA token
async function verifyRecaptcha(token) {
  try {
    if (!token) {
      throw new Error('No reCAPTCHA token provided');
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      throw new Error('reCAPTCHA secret key not configured');
    }

    console.log('Verifying reCAPTCHA token with Google');
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }
      }
    );
    
    console.log('reCAPTCHA response:', response.data);
    
    if (!response.data) {
      throw new Error('Invalid reCAPTCHA verification response');
    }

    // Log suspicious activity
    if (response.data.score < 0.5) {
      console.warn('Suspicious reCAPTCHA score:', {
        score: response.data.score,
        action: response.data.action,
        timestamp: response.data.challenge_ts
      });
    }

    return {
      success: response.data.success && response.data.score >= 0.5,
      score: response.data.score,
      action: response.data.action,
      timestamp: response.data.challenge_ts
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/* GET home page. */
router.get('/', csrfProtection, async function(req, res, next) {
  try {
    const properties = await getFeaturedProperties();
    
    res.render('index', { 
      title: 'Luxury Estates | Premium Properties',
      properties: properties,
      user: req.session.user || null,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    next(err);
  }
});

router.get('/properties', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // Number of properties per page
    
    // Get total count of active properties
    const totalProperties = await Property.countDocuments({ status: 'Active' });
    const totalPages = Math.ceil(totalProperties / limit);
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get properties for current page
    const properties = await Property.find({ status: 'Active' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first
    
    // Format price for display
    const formattedProperties = properties.map(p => ({
      ...p.toObject(),
      price: p.price.toLocaleString()
    }));

    res.render('properties', {
      properties: formattedProperties,
      currentPage: page,
      totalPages,
      totalProperties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).render('error', { 
      message: 'Error loading properties',
      error
    });
  }
});

router.get('/property/:id', async function(req, res, next) {
  try {
    const property = await Property.findById(req.params.id)
      .populate('realtor', 'name email phone image');
    
    if (!property) {
      return res.status(404).render('error', { 
        message: 'Property not found',
        error: { status: 404 }
      });
    }

    // Increment views
    property.views += 1;
    await property.save();

    // Format price for display and ensure arrays exist
    const formattedProperty = {
      ...property.toObject(),
      price: property.price.toLocaleString(),
      images: property.images || [],
      features: property.features || [],
      realtor: property.realtor || {
        name: 'Contact Us',
        email: 'info@12mgt.com',
        phone: '+1 (555) 123-4567',
        image: '/images/default-agent.jpg'
      }
    };

    res.render('property-details', { property: formattedProperty });
  } catch (error) {
    next(error);
  }
});

/* POST contact form */
router.post('/contact', csrfProtection, async function(req, res, next) {
  try {
    // Verify reCAPTCHA first
    const recaptchaResult = await verifyRecaptcha(req.body['g-recaptcha-response']);
    
    if (!recaptchaResult.success) {
      // Return JSON response for AJAX handling
      return res.status(400).json({
        error: recaptchaResult.error || 'reCAPTCHA verification failed',
        field: 'recaptcha'
      });
    }

    // Log low scores but still allow submission
    if (recaptchaResult.score < 0.7) {
      console.warn('Low reCAPTCHA score for contact submission:', {
        score: recaptchaResult.score,
        ip: req.ip,
        timestamp: new Date(),
        userAgent: req.headers['user-agent'],
        formData: {
          name: req.body.name,
          email: req.body.email,
          // Don't log message content for privacy
          messageLength: req.body.message?.length
        }
      });
    }

    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.message) {
      return res.status(400).json({
        error: 'All required fields must be filled out',
        field: 'form'
      });
    }

    const { name, email, phone, message } = req.body;
    const properties = await getFeaturedProperties();

    // Send immediate success response
    res.render('index', {
      title: 'Luxury Estates | Premium Properties',
      properties: properties,
      user: req.session.user || null,
      csrfToken: req.csrfToken(),
      contactSuccess: true
    });

    // Handle email sending after response
    setImmediate(async () => {
      try {
        // Get all admin and realtor users
        const users = await User.find({
          role: { $in: ['admin', 'realtor'] }
        }, 'email');

        if (!users.length) {
          console.error('No recipients found for contact form email');
          return;
        }

        const recipientEmails = users.map(user => user.email);

        // Prepare email content
        const mailOptions = {
          from: `"12 Properties Website" <${process.env.SMTP_FROM}>`,
          to: recipientEmails.join(', '),
          subject: 'New Contact Form Submission',
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        };

        // Send email
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error('Error sending contact form email:', error);
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Return JSON error for AJAX handling
    res.status(500).json({
      error: error.message || 'An error occurred while processing your request',
      field: error.field || 'form'
    });
  }
});

/* GET legal page */
router.get('/legal', function(req, res, next) {
  res.render('legal', { 
    title: 'Legal Documents | 12 Properties'
  });
});

module.exports = router;
