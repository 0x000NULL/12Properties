var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // Sample property data
  const properties = [
    {
      id: "1",
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      beds: 6,
      baths: 8,
      sqft: "8,500",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
    },
    {
      id: "2",
      title: "Modern Penthouse",
      location: "Manhattan, New York",
      price: "8,900,000",
      beds: 4,
      baths: 4.5,
      sqft: "4,200",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"
    },
    {
      id: "3",
      title: "Mediterranean Estate",
      location: "Beverly Hills, California",
      price: "15,750,000",
      beds: 8,
      baths: 10,
      sqft: "12,000",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
    }
  ];

  res.render('index', { 
    properties: properties
  });
});

router.get('/properties', function(req, res, next) {
  // Using the same property data for now
  const properties = [
    {
      id: "1",
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      beds: 6,
      baths: 8,
      sqft: "8,500",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
    },
    {
      id: "2",
      title: "Modern Penthouse",
      location: "Manhattan, New York",
      price: "8,900,000",
      beds: 4,
      baths: 4.5,
      sqft: "4,200",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"
    },
    {
      id: "3",
      title: "Mediterranean Estate",
      location: "Beverly Hills, California",
      price: "15,750,000",
      beds: 8,
      baths: 10,
      sqft: "12,000",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
    }
  ];

  res.render('properties', { 
    properties: properties
  });
});

router.get('/property/:id', function(req, res, next) {
  // In a real app, you would fetch this from a database using req.params.id
  // For now, we'll use sample data
  const properties = [
    {
      id: "1",
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      beds: 6,
      baths: 8,
      sqft: "8,500",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      description: "Spectacular oceanfront villa offering breathtaking views of the Pacific. This luxurious residence features high-end finishes throughout, a gourmet kitchen with top-of-the-line appliances, and an infinity pool overlooking the ocean.",
      features: [
        "Infinity Pool",
        "Wine Cellar",
        "Home Theater",
        "Private Beach Access",
        "Smart Home Technology",
        "4-Car Garage"
      ],
      additionalImages: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c"
      ],
      agent: {
        name: "Sarah Johnson",
        phone: "+1 (310) 555-0123",
        email: "sarah@12mgt.com",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a"
      }
    }
    // Add more properties as needed
  ];

  const property = properties.find(p => p.id === req.params.id) || properties[0];
  
  res.render('property-details', { property });
});

module.exports = router;
