const debugCsrf = (req, res, next) => {
  if (req.method === 'POST') {
    console.log('\nCSRF Debug ----------------');
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('CSRF Token in request body:', req.body?._csrf);
    console.log('CSRF Token in headers:', req.headers['csrf-token']);
    console.log('CSRF Token in session:', req.session?.csrfSecret);
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    console.log('-------------------------\n');
  }
  next();
};

module.exports = debugCsrf; 