const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
require('dotenv').config();

// Test SSL certificate reading
try {
  const key = fs.readFileSync(process.env.SSL_KEY_PATH);
  const cert = fs.readFileSync(process.env.SSL_CERT_PATH);
  console.log('Successfully read SSL certificates');
  
  // Get certificate info using OpenSSL
  try {
    const certInfo = execSync(`openssl x509 -in ${process.env.SSL_CERT_PATH} -text -noout`, 
      { encoding: 'utf8' });
    console.log('\nCertificate details:');
    console.log(certInfo
      .split('\n')
      .filter(line => line.match(/(Subject|Issuer|Not Before|Not After)/))
      .join('\n')
    );
  } catch (error) {
    console.log('Could not read certificate details using OpenSSL:', error.message);
  }

  // Create test server
  const server = https.createServer({
    key: key,
    cert: cert
  }, (req, res) => {
    res.writeHead(200);
    res.end('SSL test successful\n');
  });

  // Try to start server on test port
  const testPort = 8443;
  server.listen(testPort, () => {
    console.log(`\nTest HTTPS server running on port ${testPort}`);
    
    // Test the server
    const testRequest = https.request({
      hostname: 'localhost',
      port: testPort,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false // Allow self-signed certificates for testing
    }, (res) => {
      console.log('\nServer response test:');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      
      res.on('data', () => {});
      res.on('end', () => {
        server.close(() => {
          console.log('\nTest server closed successfully');
        });
      });
    });

    testRequest.on('error', (error) => {
      console.error('Error testing server:', error);
      server.close();
    });

    testRequest.end();
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('SSL Test Failed:', error);
  process.exit(1);
}