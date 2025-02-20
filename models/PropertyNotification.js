const mongoose = require('mongoose');

const propertyNotificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  },
  type: {
    type: String,
    enum: ['property', 'general'],
    default: 'general'
  },
  phone: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  notified: {
    type: Boolean,
    default: false
  }
});

// Update index to handle both types of notifications
propertyNotificationSchema.index(
  { 
    email: 1,
    type: 1,
    propertyId: 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: {
      propertyId: { $exists: true }
    }
  }
);

module.exports = mongoose.model('PropertyNotification', propertyNotificationSchema); 