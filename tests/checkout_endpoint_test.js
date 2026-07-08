const http = require('http');

async function fetchBooks() {
  const res = await fetch('http://127.0.0.1:3000/api/books');
  if (!res.ok) throw new Error(`Books request failed: ${res.status}`);
  return res.json();
}

function sendCheckout(cart) {
  const payload = {
    cart,
    sales_total_amount: cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    customer_info: {
      fullname: 'Test User',
      email: 'test@example.com',
      address: '123 Test St',
      paymentMethod: 'mobile_money',
      mobileProvider: 'mtn',
      mobileNumber: '0241234567'
    }
  };

  const data = JSON.stringify(payload);
  const options = {
    host: '127.0.0.1',
    port: 3000,
    path: '/api/admin/checkout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const books = await fetchBooks();
    const available = books.find((b) => Number(b.stock) > 0);
    if (!available) {
      console.error('No available products found.');
      return;
    }

    const cart = [{ id: available.id, title: available.title, price: available.price, quantity: 1 }];
    console.log('Using product:', available.id, available.title, 'stock', available.stock);
    const result = await sendCheckout(cart);
    console.log('checkout status', result.status);
    console.log(result.body);
  } catch (err) {
    console.error('error', err.message || err);
  }
})();
