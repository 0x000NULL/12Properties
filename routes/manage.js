const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const Property = require('../models/Property');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
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

module.exports = router; 