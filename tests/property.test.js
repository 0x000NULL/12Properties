const { request, createTestUser, getAuthToken } = require('./setup');
const mongoose = require('mongoose');

describe('Property Management', () => {
  describe('GET /manage/properties', () => {
    it('should get all properties for admin user', async () => {
      const adminUser = await createTestUser({ role: 'admin' });
      const authToken = await getAuthToken(adminUser);

      const response = await request
        .get('/manage/properties')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get only user properties for realtor', async () => {
      const realtorUser = await createTestUser({ role: 'realtor' });
      const authToken = await getAuthToken(realtorUser);

      const response = await request
        .get('/manage/properties')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fail when not authenticated', async () => {
      const response = await request.get('/manage/properties');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /manage/properties', () => {
    it('should create a new property', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const propertyData = {
        title: 'Test Property',
        description: 'A beautiful test property',
        location: '123 Test St',
        price: 500000,
        beds: 3,
        baths: 2,
        sqft: 2000,
        status: 'Active',
        listingType: 'sale',
        priceInterval: 'total'
      };

      const response = await request
        .post('/manage/properties')
        .set('Cookie', authToken)
        .send(propertyData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', propertyData.title);
      expect(response.body).toHaveProperty('realtor', user._id.toString());
    });

    it('should fail with invalid property data', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      const response = await request
        .post('/manage/properties')
        .set('Cookie', authToken)
        .send({
          title: 'Invalid Property'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /manage/properties/:id', () => {
    it('should update property details', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      // First create a property
      const property = await request
        .post('/manage/properties')
        .set('Cookie', authToken)
        .send({
          title: 'Original Title',
          description: 'Original description',
          location: '123 Test St',
          price: 500000,
          beds: 3,
          baths: 2,
          sqft: 2000,
          status: 'Active',
          listingType: 'sale',
          priceInterval: 'total'
        });

      // Then update it
      const response = await request
        .put(`/manage/properties/${property.body._id}`)
        .set('Cookie', authToken)
        .send({
          title: 'Updated Title',
          price: 550000
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Updated Title');
      expect(response.body).toHaveProperty('price', 550000);
    });

    it('should not allow updating property by non-owner', async () => {
      const owner = await createTestUser();
      const nonOwner = await createTestUser({ 
        email: 'other@example.com',
        phone: '+1234567891'
      });

      const ownerToken = await getAuthToken(owner);
      const nonOwnerToken = await getAuthToken(nonOwner);

      // Create property as owner
      const property = await request
        .post('/manage/properties')
        .set('Cookie', ownerToken)
        .send({
          title: 'Test Property',
          description: 'Test description',
          location: '123 Test St',
          price: 500000,
          beds: 3,
          baths: 2,
          sqft: 2000,
          status: 'Active',
          listingType: 'sale',
          priceInterval: 'total'
        });

      // Try to update as non-owner
      const response = await request
        .put(`/manage/properties/${property.body._id}`)
        .set('Cookie', nonOwnerToken)
        .send({
          title: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /manage/properties/:id', () => {
    it('should delete a property', async () => {
      const user = await createTestUser();
      const authToken = await getAuthToken(user);

      // First create a property
      const property = await request
        .post('/manage/properties')
        .set('Cookie', authToken)
        .send({
          title: 'Property to Delete',
          description: 'This property will be deleted',
          location: '123 Test St',
          price: 500000,
          beds: 3,
          baths: 2,
          sqft: 2000,
          status: 'Active',
          listingType: 'sale',
          priceInterval: 'total'
        });

      // Then delete it
      const response = await request
        .delete(`/manage/properties/${property.body._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);

      // Verify property is deleted
      const getResponse = await request
        .get(`/manage/properties/${property.body._id}`)
        .set('Cookie', authToken);

      expect(getResponse.status).toBe(404);
    });

    it('should not allow deleting property by non-owner', async () => {
      const owner = await createTestUser();
      const nonOwner = await createTestUser({ 
        email: 'other@example.com',
        phone: '+1234567891'
      });

      const ownerToken = await getAuthToken(owner);
      const nonOwnerToken = await getAuthToken(nonOwner);

      // Create property as owner
      const property = await request
        .post('/manage/properties')
        .set('Cookie', ownerToken)
        .send({
          title: 'Property to Not Delete',
          description: 'This property should not be deleted',
          location: '123 Test St',
          price: 500000,
          beds: 3,
          baths: 2,
          sqft: 2000,
          status: 'Active',
          listingType: 'sale',
          priceInterval: 'total'
        });

      // Try to delete as non-owner
      const response = await request
        .delete(`/manage/properties/${property.body._id}`)
        .set('Cookie', nonOwnerToken);

      expect(response.status).toBe(403);
    });
  });
}); 