const https = require('https');
const http = require('http');

const domain = '12mgtproperties.com';
const httpPort = 80;
const httpsPort = 443;

console.log('\nVerifying server configuration...');

// Test HTTP redirect
const testHttp = () => {
  return new Promise((resolve) => {
    const req = http.get(`http://${domain}`, {
      port: httpPort
    });

    req.on('response', (res) => {
      console.log('\nHTTP Test:');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      resolve();
    });

    req.on('error', (error) => {
      console.error('\nHTTP Error:', error);
      resolve();
    });
  });
};

// Test HTTPS connection
const testHttps = () => {
  return new Promise((resolve) => {
    const req = https.get(`https://${domain}`, {
      port: httpsPort,
      rejectUnauthorized: false
    });

    req.on('response', (res) => {
      console.log('\nHTTPS Test:');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      resolve();
    });

    req.on('error', (error) => {
      console.error('\nHTTPS Error:', error);
      resolve();
    });
  });
};

// Run tests
(async () => {
  await testHttp();
  await testHttps();
})();