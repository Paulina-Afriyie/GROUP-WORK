const http = require('http');
const payload = JSON.stringify({
  product_name: 'Test Update Fix',
  product_author: 'Tester',
  product_price: '10.99',
  product_quantity_in_stock: '5',
  supplier_ID: '',
  category_ID: '',
  product_image: ''
});
const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/admin/products/1',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};
const req = http.request(options, (res) => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('body', data);
  });
});
req.on('error', (e) => {
  console.error('error', e.message);
});
req.write(payload);
req.end();
