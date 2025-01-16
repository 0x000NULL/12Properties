const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');

// All manage routes require authentication
router.use(isAuthenticated);

// Main manage dashboard
router.get('/', function(req, res, next) {
  // Sample property data - replace with database query later
  const properties = [
    {
      id: "1",
      title: "Oceanfront Villa",
      location: "Malibu, California",
      price: "12,500,000",
      status: "Active",
      views: 245,
      inquiries: 12,
      lastModified: "2024-01-21"
    },
    {
      id: "2",
      title: "Modern Penthouse",
      location: "Manhattan, New York",
      price: "8,900,000",
      status: "Pending",
      views: 189,
      inquiries: 8,
      lastModified: "2024-01-20"
    }
  ];

  res.render('manage', { 
    user: req.session.user,
    properties: properties
  });
});

module.exports = router; 