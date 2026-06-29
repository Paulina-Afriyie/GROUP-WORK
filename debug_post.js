const http = require('http');

const data = JSON.stringify({
  staff_name: 'Test User',
  staff_username: 'testuser@example.com',
  staff_role: 'Manager',
  staff_password: 'Test1234'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/staff',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY', body);
  });
});

req.on('error', (err) => {
  console.error('ERROR', err.message);
});

req.write(data);
req.end();

