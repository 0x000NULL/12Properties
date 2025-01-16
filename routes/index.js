var express = require('express');
var router = express.Router();
const Property = require('../models/Property');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    // Get 3 featured properties
    const properties = await Property.find({ status: 'Active' })
      .sort({ views: -1 })
      .limit(3);

    // Format price for display
    const formattedProperties = properties.map(p => ({
      ...p.toObject(),
      price: p.price.toLocaleString()
    }));

    res.render('index', { 
      properties: formattedProperties
    });
  } catch (error) {
    next(error);
  }
});

router.get('/properties', async function(req, res, next) {
  try {
    // Get all active properties
    const properties = await Property.find({ status: 'Active' })
      .sort({ createdAt: -1 });

    // Format price for display
    const formattedProperties = properties.map(p => ({
      ...p.toObject(),
      price: p.price.toLocaleString()
    }));

    res.render('properties', { 
      properties: formattedProperties
    });
  } catch (error) {
    next(error);
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
