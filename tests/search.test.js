const { request, createTestUser, getAuthToken } = require('./setup');
const mongoose = require('mongoose');

describe('Property Search', () => {
  let testProperty;
  let authToken;

  beforeEach(async () => {
    const user = await createTestUser();
    authToken = await getAuthToken(user);

    // Create a test property
    const response = await request
      .post('/manage/properties')
      .set('Cookie', authToken)
      .send({
        title: 'Luxury Beachfront Villa',
        description: 'Beautiful beachfront property with amazing views',
        location: 'Miami Beach, FL',
        price: 2500000,
        beds: 4,
        baths: 3,
        sqft: 3500,
        status: 'Active',
        listingType: 'sale',
        priceInterval: 'total',
        features: ['beach access', 'pool', 'garage']
      });

    testProperty = response.body;
  });

  describe('GET /properties/search', () => {
    it('should search properties by location', async () => {
      const response = await request
        .get('/properties/search')
        .query({ location: 'Miami' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].location).toMatch(/Miami/);
    });

    it('should search properties by price range', async () => {
      const response = await request
        .get('/properties/search')
        .query({ 
          minPrice: 2000000,
          maxPrice: 3000000
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].price).toBeGreaterThanOrEqual(2000000);
      expect(response.body[0].price).toBeLessThanOrEqual(3000000);
    });

    it('should search properties by number of beds', async () => {
      const response = await request
        .get('/properties/search')
        .query({ beds: 4 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].beds).toBe(4);
    });

    it('should search properties by listing type', async () => {
      const response = await request
        .get('/properties/search')
        .query({ listingType: 'sale' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].listingType).toBe('sale');
    });

    it('should search properties by features', async () => {
      const response = await request
        .get('/properties/search')
        .query({ features: ['pool', 'beach access'] });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].features).toEqual(
        expect.arrayContaining(['pool', 'beach access'])
      );
    });

    it('should return empty array for no matches', async () => {
      const response = await request
        .get('/properties/search')
        .query({ 
          location: 'NonexistentLocation',
          minPrice: 999999999
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /properties/featured', () => {
    it('should return featured properties', async () => {
      const response = await request.get('/properties/featured');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should limit number of featured properties', async () => {
      const limit = 2;
      const response = await request
        .get('/properties/featured')
        .query({ limit });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('GET /properties/similar/:id', () => {
    it('should return similar properties', async () => {
      const response = await request
        .get(`/properties/similar/${testProperty._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should exclude the reference property', async () => {
      const response = await request
        .get(`/properties/similar/${testProperty._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).not.toContainEqual(
        expect.objectContaining({ _id: testProperty._id })
      );
    });
  });
}); 