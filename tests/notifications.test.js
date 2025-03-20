const { request, createTestUser, getAuthToken } = require('./setup');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const PropertyNotification = require('../models/PropertyNotification');

// Define Notification Schema if it doesn't exist
let Notification;
if (!mongoose.models.Notification) {
  const notificationSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['property_update', 'system', 'alert', 'test']
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });
  Notification = mongoose.model('Notification', notificationSchema);
} else {
  Notification = mongoose.model('Notification');
}

describe('Notifications', () => {
  let user;
  let authToken;
  let testProperty;

  beforeEach(async () => {
    // Create test user
    user = await createTestUser({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      role: 'USER'
    });
    authToken = await getAuthToken(user);

    // Create a test property
    testProperty = await Property.create({
      title: 'Test Property',
      description: 'A test property',
      location: 'Test Location',
      price: 500000,
      status: 'Coming Soon',
      realtor: user._id,
      beds: 3,
      baths: 2,
      sqft: 2000
    });
  });

  afterEach(async () => {
    // Clean up notifications and properties after each test
    await PropertyNotification.deleteMany({});
    await Property.deleteMany({});
  });

  describe('POST /notifications/notify', () => {
    it('should create notification subscription for coming soon property', async () => {
      const response = await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: testProperty._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('will be notified');

      // Verify notification was created
      const notification = await PropertyNotification.findOne({
        email: 'john@example.com',
        propertyId: testProperty._id
      });
      expect(notification).toBeTruthy();
    });

    it('should create general notification subscription', async () => {
      const response = await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: 'coming-soon'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('new properties become available');

      // Verify notification was created
      const notification = await PropertyNotification.findOne({
        email: 'john@example.com',
        type: 'general'
      });
      expect(notification).toBeTruthy();
    });

    it('should fail with invalid property id', async () => {
      const response = await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeTruthy();
    });

    it('should fail if property is not in Coming Soon status', async () => {
      // Update property status
      testProperty.status = 'Active';
      await testProperty.save();

      const response = await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: testProperty._id.toString()
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not available for notifications');
    });

    it('should prevent duplicate subscriptions', async () => {
      // Create first subscription
      await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: testProperty._id.toString()
        });

      // Try to create duplicate subscription
      const response = await request
        .post('/notifications/notify')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          propertyId: testProperty._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already subscribed');
    });
  });

  describe('GET /manage/notifications', () => {
    beforeEach(async () => {
      // Create some test notifications
      await PropertyNotification.create({
        name: 'Test User',
        email: 'test@example.com',
        propertyId: testProperty._id,
        phone: '+1234567890'
      });

      await PropertyNotification.create({
        name: 'General User',
        email: 'general@example.com',
        type: 'general',
        phone: '+1234567891'
      });
    });

    it('should show notifications when authenticated', async () => {
      const response = await request
        .get('/manage/notifications')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      // Since this route renders a view, we check if it contains expected content
      expect(response.text).toContain('Property Notifications');
      expect(response.text).toContain('Test Property');
    });

    it('should redirect to login when not authenticated', async () => {
      const response = await request
        .get('/manage/notifications');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/auth/login');
    });

    it('should show all notifications for admin users', async () => {
      // Create admin user
      const adminUser = await createTestUser({
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '+1234567892',
        role: 'admin'
      });
      const adminToken = await getAuthToken(adminUser);

      const response = await request
        .get('/manage/notifications')
        .set('Cookie', adminToken);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Test Property');
      expect(response.text).toContain('general@example.com');
    });
  });

  describe('GET /api/notifications', () => {
    let testNotification;

    beforeEach(async () => {
      // Create a test notification
      testNotification = await Notification.create({
        userId: user._id,
        type: 'property_update',
        title: 'Property Update',
        message: 'A property you are watching has been updated',
        isRead: false
      });
    });

    afterEach(async () => {
      // Clean up notifications after each test
      await Notification.deleteMany({});
    });

    it('should get user notifications when authenticated', async () => {
      const response = await request
        .get('/api/notifications')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('type', 'property_update');
    });

    it('should fail when not authenticated', async () => {
      const response = await request
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });

    it('should return only unread notifications', async () => {
      const response = await request
        .get('/api/notifications')
        .query({ unread: true })
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(notif => !notif.isRead)).toBe(true);
    });

    it('should paginate notifications', async () => {
      // Create multiple notifications
      await Promise.all([...Array(5)].map((_, i) => 
        Notification.create({
          userId: user._id,
          type: 'test',
          title: `Test ${i}`,
          message: `Test message ${i}`,
          isRead: false
        })
      ));

      const response = await request
        .get('/api/notifications')
        .query({ page: 1, limit: 3 })
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(response.body.notifications.length).toBeLessThanOrEqual(3);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage', 1);
    });
  });

  describe('POST /api/notifications/mark-read', () => {
    it('should mark notification as read', async () => {
      const response = await request
        .post('/api/notifications/mark-read')
        .set('Cookie', authToken)
        .send({ notificationId: testNotification._id });

      expect(response.status).toBe(200);
      
      // Verify notification is marked as read
      const updated = await Notification.findById(testNotification._id);
      expect(updated.isRead).toBe(true);
    });

    it('should fail with invalid notification id', async () => {
      const response = await request
        .post('/api/notifications/mark-read')
        .set('Cookie', authToken)
        .send({ notificationId: 'invalid-id' });

      expect(response.status).toBe(400);
    });

    it('should fail to mark notification of another user', async () => {
      const otherUser = await createTestUser({ 
        email: 'other@example.com',
        phone: '+1234567891'
      });

      const otherNotification = await Notification.create({
        userId: otherUser._id,
        type: 'test',
        title: 'Test',
        message: 'Test message',
        isRead: false
      });

      const response = await request
        .post('/api/notifications/mark-read')
        .set('Cookie', authToken)
        .send({ notificationId: otherNotification._id });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      const response = await request
        .post('/api/notifications/mark-all-read')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);

      // Verify all notifications are marked as read
      const unread = await Notification.countDocuments({
        userId: user._id,
        isRead: false
      });
      expect(unread).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const response = await request
        .delete(`/api/notifications/${testNotification._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);

      // Verify notification is deleted
      const deleted = await Notification.findById(testNotification._id);
      expect(deleted).toBeNull();
    });

    it('should fail to delete notification of another user', async () => {
      const otherUser = await createTestUser({ 
        email: 'other@example.com',
        phone: '+1234567891'
      });

      const otherNotification = await Notification.create({
        userId: otherUser._id,
        type: 'test',
        title: 'Test',
        message: 'Test message',
        isRead: false
      });

      const response = await request
        .delete(`/api/notifications/${otherNotification._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/notifications/count', () => {
    it('should return unread notification count', async () => {
      const response = await request
        .get('/api/notifications/count')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    it('should return zero count when all notifications are read', async () => {
      // Mark all notifications as read
      await request
        .post('/api/notifications/mark-all-read')
        .set('Cookie', authToken);

      const response = await request
        .get('/api/notifications/count')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count', 0);
    });
  });
}); 