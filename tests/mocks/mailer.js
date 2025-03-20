// Mock nodemailer for testing
const mockMailer = {
  sendMail: jest.fn().mockImplementation((mailOptions) => {
    return Promise.resolve({
      messageId: 'test-message-id',
      response: 'test-response'
    });
  })
};

module.exports = mockMailer; 