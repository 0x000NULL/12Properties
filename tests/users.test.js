const { request, createTestUser, getAuthToken } = require('./setup');
const mongoose = require('mongoose');

describe('User Management', () => {
  describe('GET /users/profile', () => {
    it('should get user profile when authenticated', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .get('/users/profile')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', user.email);
      expect(response.body).toHaveProperty('firstName', user.firstName);
      expect(response.body).toHaveProperty('lastName', user.lastName);
    });

    it('should fail when not authenticated', async () => {
      const response = await request
        .get('/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const updatedData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request
        .put('/users/profile')
        .set('Cookie', authToken)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('firstName', updatedData.firstName);
      expect(response.body).toHaveProperty('lastName', updatedData.lastName);
    });

    it('should fail with invalid data', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .put('/users/profile')
        .set('Cookie', authToken)
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /users/change-password', () => {
    it('should change password successfully', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .post('/users/change-password')
        .set('Cookie', authToken)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password updated successfully');

      // Verify can login with new password
      const loginResponse = await request
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'NewPassword123!'
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should fail with incorrect current password', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .post('/users/change-password')
        .set('Cookie', authToken)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(400);
    });

    it('should fail when passwords do not match', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .post('/users/change-password')
        .set('Cookie', authToken)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        });

      expect(response.status).toBe(400);
    });
  });
}); 