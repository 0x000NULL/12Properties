const { request, createTestUser, getAuthToken } = require('./setup');
const mongoose = require('mongoose');

describe('Contact', () => {
  let csrfToken;
  let authToken;

  beforeEach(async () => {
    // Get CSRF token
    const response = await request.get('/');
    const cookies = response.headers['set-cookie'];
    const csrfCookie = cookies.find(cookie => cookie.includes('XSRF-TOKEN'));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : null;

    // Create test user and get auth token
    const user = await createTestUser();
    authToken = await getAuthToken(user);
  });

  describe('POST /api/contact', () => {
    it('should submit contact form successfully when not authenticated', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        message: 'This is a test message',
        _csrf: csrfToken
      };

      const response = await request
        .post('/api/contact')
        .set('Cookie', `XSRF-TOKEN=${csrfToken}`)
        .send(contactData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should submit contact form successfully when authenticated', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        message: 'This is a test message',
        _csrf: csrfToken
      };

      const response = await request
        .post('/api/contact')
        .set('Cookie', [
          `XSRF-TOKEN=${csrfToken}`,
          ...authToken
        ])
        .send(contactData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail with missing required fields', async () => {
      const response = await request
        .post('/api/contact')
        .set('Cookie', `XSRF-TOKEN=${csrfToken}`)
        .send({
          name: 'Test User',
          _csrf: csrfToken
          // Missing email and message
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid email format', async () => {
      const contactData = {
        name: 'Test User',
        email: 'invalid-email',
        message: 'Test message',
        _csrf: csrfToken
      };

      const response = await request
        .post('/api/contact')
        .set('Cookie', `XSRF-TOKEN=${csrfToken}`)
        .send(contactData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail without CSRF token', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
        // Missing _csrf token
      };

      const response = await request
        .post('/api/contact')
        .send(contactData);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/contact/categories', () => {
    it('should return available contact categories', async () => {
      const response = await request
        .get('/api/contact/categories')
        .set('Cookie', `XSRF-TOKEN=${csrfToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/contact/history', () => {
    it('should return contact history for authenticated user', async () => {
      // First submit a contact form
      await request
        .post('/api/contact')
        .set('Cookie', [
          `XSRF-TOKEN=${csrfToken}`,
          ...authToken
        ])
        .send({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          _csrf: csrfToken
        });

      const response = await request
        .get('/api/contact/history')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should fail when not authenticated', async () => {
      const response = await request
        .get('/api/contact/history');

      expect(response.status).toBe(401);
    });
  });
}); 