const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const supertest = require('supertest');

let mongod;
let app;

// Connect to the in-memory database before running tests
beforeAll(async () => {
  // Close any existing connections
  await mongoose.disconnect();

  // Create new in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Update environment variables to use test database
  process.env.MONGODB_URI = uri;

  // Now require the app (after setting test environment)
  const { app: expressApp } = require('../app');
  app = expressApp;
});

// Clear all test data after every test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany();
    }
  }
});

// Disconnect and stop mongodb after all tests are finished
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Create a test request object
const request = supertest(app);

// Helper function to create a test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    name: 'Test User',
    phone: '+1234567890',
    role: 'realtor',  // Changed from 'USER' to 'realtor'
    isActive: true,
    isVerified: true
  };

  const User = mongoose.model('User');
  return await User.create({ ...defaultUser, ...userData });
};

// Helper function to generate auth token
const getAuthToken = async (user) => {
  const response = await request
    .post('/auth/login')
    .send({
      email: user.email,
      password: user.password
    });
  
  return response.headers['set-cookie'];
};

module.exports = {
  request,
  createTestUser,
  getAuthToken
}; 