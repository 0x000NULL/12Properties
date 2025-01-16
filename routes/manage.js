const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const sessionCheck = require('../middleware/session');
const Property = require('../models/Property');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { skip: skipCSRF } = require('../middleware/csrf');

// Configure multer for image uploads with session handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/properties')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// All manage routes require authentication
router.use(isAuthenticated);

// Apply session check to all manage routes
router.use(sessionCheck);

// Main manage dashboard
router.get('/', async function(req, res, next) {
  try {
    if (!req.session.user || !req.session.user._id) {
      throw new Error('User ID not found in session');
    }

    // Convert string ID to ObjectId
    const userId = new mongoose.Types.ObjectId(req.session.user._id);
    
    let properties;
    
    // If user is admin, show all properties, otherwise show only their properties
    if (req.session.user.role === 'admin') {
      properties = await Property.find({})
        .sort({ lastModified: -1 })
        .populate('realtor', 'name email'); // Include realtor details
    } else {
      properties = await Property.find({ realtor: userId })
        .sort({ lastModified: -1 });
    }

    res.render('manage', { 
      user: req.session.user,
      properties: properties,
      isAdmin: req.session.user.role === 'admin'
    });
  } catch (err) {
    console.error('Error in manage route:', err);
    res.render('manage', { 
      user: req.session.user,
      properties: [],
      isAdmin: req.session.user.role === 'admin',
      error: 'Failed to load properties. Please try again later.'
    });
  }
});

// Add this temporary route to update property ownership
router.get('/update-ownership', async function(req, res, next) {
  try {
    if (!req.session.user || !req.session.user._id) {
      throw new Error('User ID not found in session');
    }

    const userId = new mongoose.Types.ObjectId(req.session.user._id);
    
    // Update all properties to be owned by the current user
    const result = await Property.updateMany(
      {}, 
      { $set: { realtor: userId } }
    );

    res.json({
      message: `Updated ${result.modifiedCount} properties`,
      success: true
    });
  } catch (err) {
    console.error('Error updating ownership:', err);
    res.status(500).json({
      message: 'Failed to update property ownership',
      error: err.message
    });
  }
});

// Show new property form
router.get('/new', isAuthenticated, function(req, res) {
  res.render('property-form', {
    user: req.session.user,
    property: null,
    isNew: true
  });
});

// Create new property
router.post('/new', 
  isAuthenticated, 
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  async function(req, res, next) {
    try {
      const propertyData = {
        ...req.body,
        realtor: req.session.user._id,
        price: parseFloat(req.body.price),
        beds: parseInt(req.body.beds),
        baths: parseFloat(req.body.baths),
        sqft: parseInt(req.body.sqft),
        features: req.body.features.split(',').map(f => f.trim()),
        mainImage: '/images/properties/' + req.files.mainImage[0].filename,
        images: req.files.images ? 
          req.files.images.map(file => '/images/properties/' + file.filename) : 
          []
      };

      const property = new Property(propertyData);
      await property.save();

      res.redirect('/manage');
    } catch (err) {
      console.error('Error creating property:', err);
      res.render('property-form', {
        user: req.session.user,
        property: req.body,
        isNew: true,
        error: 'Failed to create property. Please try again.'
      });
    }
  }
);

// Show edit property form
router.get('/edit/:id', isAuthenticated, async function(req, res) {
  try {
    const property = await Property.findById(req.params.id);
    
    // Check if property exists and user has permission
    if (!property || 
        (property.realtor.toString() !== req.session.user._id && 
         req.session.user.role !== 'admin')) {
      return res.redirect('/manage');
    }

    res.render('property-form', {
      user: req.session.user,
      property: property,
      isNew: false
    });
  } catch (err) {
    console.error('Error loading property:', err);
    res.redirect('/manage');
  }
});

// Handle property update
router.post('/edit/:id', 
  isAuthenticated,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'imageOrder', maxCount: 1 }
  ]),
  async function(req, res, next) {
    console.log('\nPost-upload middleware ----------------');
    console.log('CSRF Token in headers:', req.headers['csrf-token']);
    console.log('Files received:', req.files);
    console.log('----------------------------------------\n');

    try {
      // Add CSRF token from headers to body
      if (req.headers['csrf-token']) {
        req.body._csrf = req.headers['csrf-token'];
      }

      const property = await Property.findById(req.params.id);
      
      // Check permissions
      if (!property || 
          (property.realtor.toString() !== req.session.user._id && 
           req.session.user.role !== 'admin')) {
        return res.redirect('/manage');
      }

      // Update basic info
      property.title = req.body.title;
      property.description = req.body.description;
      property.location = req.body.location;
      property.price = parseFloat(req.body.price);
      property.status = req.body.status;
      property.beds = parseInt(req.body.beds);
      property.baths = parseFloat(req.body.baths);
      property.sqft = parseInt(req.body.sqft);
      property.features = req.body.features.split(',').map(f => f.trim());

      // Handle main image update
      if (req.files.mainImage && req.files.mainImage[0]) {
        property.mainImage = '/images/properties/' + req.files.mainImage[0].filename;
      } else if (req.body.mainImageUrl) {
        // If an existing image was selected as main
        property.mainImage = req.body.mainImageUrl;
      }

      // Handle additional images
      if (req.files.images) {
        const newImages = req.files.images.map(file => '/images/properties/' + file.filename);
        
        // If imageOrder was provided, use it to arrange images
        if (req.body.imageOrder) {
          const orderArray = JSON.parse(req.body.imageOrder);
          const existingImages = property.images.filter((_, index) => orderArray.includes(index));
          property.images = [...existingImages, ...newImages];
        } else {
          property.images = [...property.images, ...newImages];
        }
      } else if (req.body.imageOrder) {
        // Update image order without new uploads
        const orderArray = JSON.parse(req.body.imageOrder);
        property.images = orderArray.map(index => property.images[index]);
      }

      // Handle image deletions
      if (req.body.deleteImages) {
        const deleteIndices = JSON.parse(req.body.deleteImages);
        property.images = property.images.filter((_, index) => !deleteIndices.includes(index));
      }

      await property.save();
      res.redirect('/manage');
    } catch (err) {
      console.error('Error updating property:', err);
      // Check if it's a CSRF error
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('property-form', {
          user: req.session.user,
          property: await Property.findById(req.params.id),
          isNew: false,
          error: 'Security token expired. Please try submitting the form again.'
        });
      }
      res.render('property-form', {
        user: req.session.user,
        property: req.body,
        isNew: false,
        error: 'Failed to update property. Please try again.'
      });
    }
  }
);

// API routes use skipCSRF
router.delete('/api/properties/:id', skipCSRF, async function(req, res, next) {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await property.remove();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ message: 'Failed to delete property' });
  }
});

module.exports = router; 