const { request, createTestUser } = require('./setup');
const mongoose = require('mongoose');

describe('Authentication', () => {
  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await createTestUser();
      const response = await request
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing credentials', async () => {
      const response = await request
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser();
      const loginResponse = await request
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'Password123!'
        });

      const cookie = loginResponse.headers['set-cookie'];
      
      const response = await request
        .post('/auth/logout')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('GET /auth/check', () => {
    it('should return authenticated status for logged in user', async () => {
      const user = await createTestUser();
      const loginResponse = await request
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'Password123!'
        });

      const cookie = loginResponse.headers['set-cookie'];
      
      const response = await request
        .get('/auth/check')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated', true);
      expect(response.body).toHaveProperty('user');
    });

    it('should return unauthenticated status for non-logged in user', async () => {
      const response = await request
        .get('/auth/check');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('authenticated', false);
    });
  });
}); 