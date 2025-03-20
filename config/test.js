module.exports = {
  mongodb: {
    useMemoryServer: true
  },
  auth: {
    roles: ['realtor', 'admin'],  // Updated to match User model's enum values
    defaultRole: 'realtor'
  },
  session: {
    secret: 'test-secret'
  },
  mail: {
    useMock: true
  }
}; 