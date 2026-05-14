const http = require('http');

const postData = JSON.stringify({
  gp_email: 'gp1@gmail.com',
  gp_password: '123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/gp/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();