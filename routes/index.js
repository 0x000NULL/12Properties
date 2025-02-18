var express = require('express');
var router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const transporter = require('../config/mailer');
const csrf = require('csurf');
const NodeCache = require('node-cache');

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
    
    const properties = await getFeaturedProperties();
    
    res.render('index', {
      title: 'Luxury Estates | Premium Properties',
      properties: properties,
      user: req.session.user || null,
      csrfToken: req.csrfToken(),
      contactError: error.message || 'Sorry, there was an error sending your message. Please try again.'
    });
  }
});

module.exports = router;
