var express = require('express');
var router = express.Router();
const Property = require('../models/Property');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    const properties = await Property.find({ status: 'Active' })
      .sort({ createdAt: -1 })
      .limit(6); // Show only 6 featured properties

    res.render('index', { 
      title: 'Luxury Estates | Premium Properties',
      properties: properties,
      user: req.session.user || null
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

module.exports = router;
