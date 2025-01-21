const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Sold'],
    default: 'Active'
  },
  beds: {
    type: Number,
    required: true,
    min: 0
  },
  baths: {
    type: Number,
    required: true,
    min: 0
  },
  sqft: {
    type: Number,
    required: true,
    min: 0
  },
  mainImage: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  mainVideo: {
    url: {
      type: String,
      required: false
    },
    thumbnail: {
      type: String,
      required: false
    },
    duration: {
      type: Number,  // Duration in seconds
      required: false
    }
  },
  videos: [{
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String,
      required: false
    },
    duration: {
      type: Number,  // Duration in seconds
      required: false
    },
    title: {
      type: String,
      trim: true,
      required: false
    }
  }],
  features: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  realtor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'properties'
});

// Update lastModified on save
propertySchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Property', propertySchema); 