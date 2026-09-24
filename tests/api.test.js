const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server/server');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    // Listen on random available port
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('API Integration: GET /api/product returns valid product structure & inventory', async () => {
  const res = await fetch(`${baseUrl}/api/product`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.variants.standard);
  assert.ok(data.data.variants.maker_kit);
  assert.ok(data.data.variants.cyber_pro);
  assert.strictEqual(typeof data.data.variants.standard.stockCount, 'number');
});

test('API Integration: POST /api/pricing/calculate returns server authoritative price', async () => {
  const res = await fetch(`${baseUrl}/api/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variant: 'standard',
      quantity: 1,
      addons: ['dock'],
      couponCode: 'IPET2026',
      paymentMethod: 'vietqr'
    })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  // Standard = 1,490,000 + dock = 250,000 => 1,740,000 - 10% (174,000) = 1,566,000
  assert.strictEqual(data.data.subtotal, 1740000);
  assert.strictEqual(data.data.discountAmount, 174000);
  assert.strictEqual(data.data.total, 1566000);
});

test('API Integration: Full Order Lifecycle: Create -> Lookup -> Admin Verify & Transition', async () => {
  // 1. Create order
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Trần Văn Test',
      phone: '0988776655',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      address: 'Số 1 Phạm Văn Bạch',
      variant: 'cyber_pro',
      color: 'obsidian',
      quantity: 1,
      addons: ['dock'],
      paymentMethod: 'vietqr'
    })
  });

  assert.strictEqual(orderRes.status, 200);
  const orderData = await orderRes.json();
  assert.strictEqual(orderData.success, true);
  const orderId = orderData.data.orderId;
  assert.ok(orderId.startsWith('IPET-'));
  assert.strictEqual(orderData.data.status, 'PAYMENT_PENDING');
  assert.ok(orderData.data.vietqr);
  assert.ok(orderData.data.vietqr.qrImageUrl.includes('MB-0338888999'));

  // 2. Lookup order by customer
  const lookupRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
  assert.strictEqual(lookupRes.status, 200);
  const lookupData = await lookupRes.json();
  assert.strictEqual(lookupData.data.id, orderId);
  assert.strictEqual(lookupData.data.status, 'PAYMENT_PENDING');

  // 3. Admin login
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'ipet@2026' })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  const token = loginData.data.token;
  assert.ok(token);

  // 4. Admin transition order: PAYMENT_PENDING -> PAID
  const transitionRes = await fetch(`${baseUrl}/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ nextStatus: 'PAID', reason: 'Đã nhận chuyển khoản MBBank' })
  });
  assert.strictEqual(transitionRes.status, 200);
  const transitionData = await transitionRes.json();
  assert.strictEqual(transitionData.success, true);
  assert.strictEqual(transitionData.data.status, 'PAID');
  assert.strictEqual(transitionData.data.paymentStatus, 'PAID');

  // 5. Lookup again to verify transition persisted
  const verifyRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.data.status, 'PAID');
});

test('API Integration: GET /api/reviews returns approved reviews', async () => {
  const res = await fetch(`${baseUrl}/api/reviews`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.reviews.length >= 3);
  assert.strictEqual(typeof data.data.averageRating, 'number');
});
