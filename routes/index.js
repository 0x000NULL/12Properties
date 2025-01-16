var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // Sample property data
  const properties = [
    {
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      beds: 6,
      baths: 8,
      sqft: "8,500",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
    },
    {
      title: "Modern Penthouse",
      location: "Manhattan, New York",
      price: "8,900,000",
      beds: 4,
      baths: 4.5,
      sqft: "4,200",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"
    },
    {
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
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      beds: 6,
      baths: 8,
      sqft: "8,500",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
    },
    {
      title: "Modern Penthouse",
      location: "Manhattan, New York",
      price: "8,900,000",
      beds: 4,
      baths: 4.5,
      sqft: "4,200",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"
    },
    {
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

module.exports = router;
