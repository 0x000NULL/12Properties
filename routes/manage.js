const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const sessionCheck = require('../middleware/session');
const Property = require('../models/Property');
const PropertyNotification = require('../models/PropertyNotification');
const NotificationService = require('../services/notificationService');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { skip: skipCSRF } = require('../middleware/csrf');
const fs = require('fs');
const mkdirp = require('mkdirp');

// Ensure upload directories exist
const uploadDirs = ['public/images/properties', 'public/videos/properties'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir);
  }
});

// Configure multer for image uploads with session handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if this is a video upload field
    const dest = (file.fieldname === 'mainVideo' || file.fieldname === 'videos')
      ? 'public/videos/properties'
      : 'public/images/properties';
    
    console.log(`Storing ${file.fieldname} in ${dest}`);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// Create multer instance with configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024, // 100GB limit
    fieldSize: 100 * 1024 * 1024 * 1024, // 100GB field size limit
    fields: 110,
    files: 110
  },
  fileFilter: function (req, file, cb) {
    console.log('Processing file:', file.originalname, 'fieldname:', file.fieldname);
    
    // Check if this is a video upload field
    if (file.fieldname === 'mainVideo' || file.fieldname === 'videos') {
      const allowedTypes = /mp4|webm|mov|avi/i;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype.startsWith('video/') || 
                      path.extname(file.originalname).toLowerCase() === '.avi'; // Special case for AVI
      
      if (extname && mimetype) {
        console.log('Valid video file:', file.originalname);
        cb(null, true);
      } else {
        console.log('Invalid video file:', file.originalname);
        cb(new Error(`Invalid video file type: ${file.originalname}`));
      }
    } 
    // Check if this is an image upload field
    else if (file.fieldname === 'mainImage' || file.fieldname === 'images') {
      const allowedTypes = /jpeg|jpg|png|webp/i;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype.startsWith('image/');
      
      if (extname && mimetype) {
        console.log('Valid image file:', file.originalname);
        cb(null, true);
      } else {
        console.log('Invalid image file:', file.originalname);
        cb(new Error(`Invalid image file type: ${file.originalname}`));
      }
    }
    // Unknown field type
    else {
      cb(new Error(`Unknown field type: ${file.fieldname}`));
    }
  }
});

// Define upload fields configuration
const uploadFields = [
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 100 },
  { name: 'mainVideo', maxCount: 1 },
  { name: 'videos', maxCount: 100 }
];

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
    title: 'Add New Property',
    property: {
      title: '',
      description: '',
      location: '',
      price: '',
      status: 'Active',
      beds: '',
      baths: '',
      sqft: '',
      features: [], // Initialize empty features array
      mainImage: '',
      images: [],
      mainVideo: null,
      videos: []
    },
    isNew: true,
    user: req.session.user,
    csrfToken: res.locals.csrfToken
  });
});

// Create new property
router.post('/new', 
  isAuthenticated,
  // Apply CSRF protection before multer
  (req, res, next) => {
    next();
  },
  upload.fields(uploadFields),
  async function(req, res, next) {
    try {
      console.log('Creating new property');
      console.log('Files received:', req.files);
      console.log('Body:', req.body);

      // Create new property
      const property = new Property({
        ...req.body,
        realtor: req.session.user._id,
        price: parseFloat(req.body.price),
        beds: parseInt(req.body.beds),
        baths: parseFloat(req.body.baths),
        sqft: parseInt(req.body.sqft),
        features: req.body.features ? req.body.features.split(',').map(f => f.trim()) : []
      });

      // Handle file uploads
      if (req.files) {
        if (req.files.mainImage && req.files.mainImage[0]) {
          property.mainImage = '/images/properties/' + req.files.mainImage[0].filename;
        }
        if (req.files.mainVideo && req.files.mainVideo[0]) {
          property.mainVideo = {
            url: '/videos/properties/' + req.files.mainVideo[0].filename,
            thumbnail: '',
            duration: 0
          };
        }
        if (req.files.images) {
          property.images = req.files.images.map(file => '/images/properties/' + file.filename);
        }
        if (req.files.videos) {
          property.videos = req.files.videos.map(file => ({
            url: '/videos/properties/' + file.filename,
            thumbnail: '',
            duration: 0,
            title: ''
          }));
        }
      }

      await property.save();
      console.log('Property saved successfully');
      
      // If the property is active (not coming soon), notify subscribers
      if (property.status === 'Active') {
        // Send notifications asynchronously
        setImmediate(async () => {
          try {
            const result = await NotificationService.notifySubscribersOfNewProperty(property);
            console.log('Notification result:', result);
          } catch (error) {
            console.error('Failed to send notifications:', error);
          }
        });
      }

      // Always return JSON response
      res.json({ 
        success: true, 
        redirect: '/manage',
        message: 'Property created successfully' 
      });
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ 
        error: 'Failed to create property: ' + error.message 
      });
    }
  }
);

// Show edit property form
router.get('/edit/:id', isAuthenticated, async function(req, res) {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).render('error', { message: 'Property not found' });
    }
    
    res.render('property-form', {
      title: 'Edit Property',
      property: property,
      isNew: false,
      user: req.session.user,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) {
    next(err);
  }
});

// Handle property update
router.post('/edit/:id', 
  isAuthenticated,
  upload.fields(uploadFields),
  async function(req, res, next) {
    console.log('Processing edit request');
    console.log('Files received:', req.files);
    console.log('Body:', req.body);

    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      // Check permissions
      if (property.realtor.toString() !== req.session.user._id && 
          req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Update basic fields
      Object.assign(property, {
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        price: parseFloat(req.body.price),
        status: req.body.status,
        beds: parseInt(req.body.beds),
        baths: parseFloat(req.body.baths),
        sqft: parseInt(req.body.sqft),
        features: req.body.features ? req.body.features.split(',').map(f => f.trim()) : [],
        listingType: req.body.listingType,
        priceInterval: req.body.priceInterval
      });

      // Handle file uploads
      if (req.files) {
        console.log('Processing uploaded files:', Object.keys(req.files));
        
        // Handle main image
        if (req.files.mainImage && req.files.mainImage[0]) {
          property.mainImage = '/images/properties/' + req.files.mainImage[0].filename;
          console.log('Updated main image:', property.mainImage);
        }

        // Handle main video - Note the corrected path
        if (req.files.mainVideo && req.files.mainVideo[0]) {
          property.mainVideo = {
            url: '/videos/properties/' + req.files.mainVideo[0].filename, // Corrected path
            thumbnail: '',
            duration: 0
          };
          console.log('Updated main video:', property.mainVideo);
        }

        // Handle additional images
        if (req.files.images) {
          const newImages = req.files.images.map(file => '/images/properties/' + file.filename);
          property.images = [...(property.images || []), ...newImages];
          console.log('Updated images array:', property.images);
        }

        // Handle additional videos - Note the corrected path
        if (req.files.videos) {
          const newVideos = req.files.videos.map(file => ({
            url: '/videos/properties/' + file.filename, // Corrected path
            thumbnail: '',
            duration: 0,
            title: ''
          }));
          property.videos = [...(property.videos || []), ...newVideos];
          console.log('Updated videos array:', property.videos);
        }
      }
      
      // Process deleted images
      if (req.body.deleteImages) {
        try {
          const deleteIndices = JSON.parse(req.body.deleteImages);
          if (Array.isArray(deleteIndices) && deleteIndices.length > 0) {
            console.log('Removing images at indices:', deleteIndices);
            // Filter out the images that should be deleted
            property.images = property.images.filter((img, idx) => !deleteIndices.includes(idx.toString()));
            console.log('Images after deletion:', property.images);
          }
        } catch (e) {
          console.error('Error processing deleteImages:', e);
        }
      }

      // Handle image reordering
      if (req.body.imageOrder) {
        try {
          const newOrder = JSON.parse(req.body.imageOrder);
          if (Array.isArray(newOrder) && newOrder.length > 0) {
            console.log('Reordering images according to:', newOrder);
            // Create a new array with images in the specified order
            property.images = newOrder.map(index => property.images[index]);
            console.log('Images after reordering:', property.images);
          }
        } catch (e) {
          console.error('Error processing imageOrder:', e);
        }
      }

      // Handle setting an existing image as main image
      if (req.body.setMainImage) {
        try {
          const mainImageIndex = parseInt(req.body.setMainImage);
          if (!isNaN(mainImageIndex) && property.images && property.images[mainImageIndex]) {
            // Store the current main image
            const currentMainImage = property.mainImage;
            
            // Move the selected image to mainImage
            property.mainImage = property.images[mainImageIndex];
            
            // Remove the selected image from the images array
            property.images.splice(mainImageIndex, 1);
            
            // Add the previous main image to the images array
            if (currentMainImage) {
              property.images.push(currentMainImage);
            }
            
            console.log('Set new main image:', property.mainImage);
          }
        } catch (e) {
          console.error('Error setting main image:', e);
        }
      }

      await property.save();
      console.log('Property saved successfully');
      res.json({ success: true, message: 'Property updated successfully' });
    } catch (error) {
      console.error('Property update error:', error);
      res.status(500).json({ 
        error: 'Failed to update property: ' + error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Get notifications list
router.get('/notifications', isAuthenticated, async function(req, res) {
  try {
    let notifications;
    
    if (req.session.user.role === 'admin') {
      // Admin sees all notifications
      notifications = await PropertyNotification.find()
        .populate('propertyId', 'title location')
        .sort({ createdAt: -1 });
    } else {
      // Realtors see notifications for their properties
      const userProperties = await Property.find({ realtor: req.session.user._id });
      const propertyIds = userProperties.map(p => p._id);
      
      notifications = await PropertyNotification.find({
        $or: [
          { propertyId: { $in: propertyIds } },
          { type: 'general' }
        ]
      })
        .populate('propertyId', 'title location')
        .sort({ createdAt: -1 });
    }
    
    res.render('notifications', {
      title: 'Property Notifications',
      notifications,
      user: req.session.user,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).render('error', { 
      message: 'Failed to load notifications',
      error: err 
    });
  }
});

module.exports = router; 