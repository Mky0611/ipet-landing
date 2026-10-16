const test = require('node:test');
const assert = require('node:assert');
const app = require('../server/server');
const { getDb } = require('../server/db/database');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
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

test('Order Transaction: COD order initializes as PENDING with COD_PENDING payment status and decrements stock', async () => {
  const db = getDb();
  
  // Record stock before order
  const initialStockRow = db.prepare('SELECT stock_count FROM inventory WHERE variant_id = ?').get('standard');
  const initialStock = initialStockRow ? initialStockRow.stock_count : 50;

  const orderPayload = {
    fullName: 'Nguyen Van COD',
    phone: '0987654321',
    province: 'TP Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Bến Nghé',
    address: '123 Đường Đồng Khởi',
    variant: 'standard',
    color: 'obsidian',
    addons: [],
    quantity: 1,
    paymentMethod: 'cod'
  };

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.orderId);
  assert.strictEqual(data.data.status, 'PENDING', 'COD order must start as PENDING');
  assert.strictEqual(data.data.paymentStatus, 'COD_PENDING', 'Payment status must be COD_PENDING');

  // Verify DB state
  const dbOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(data.data.orderId);
  assert.ok(dbOrder);
  assert.strictEqual(dbOrder.status, 'PENDING');
  assert.strictEqual(dbOrder.payment_status, 'COD_PENDING');
  assert.strictEqual(dbOrder.payment_method, 'cod');

  // Verify atomic stock deduction
  const postStockRow = db.prepare('SELECT stock_count FROM inventory WHERE variant_id = ?').get('standard');
  assert.strictEqual(postStockRow.stock_count, initialStock - 1);
});

test('Order Transaction: VietQR transfer initializes as PAYMENT_PENDING with UNPAID payment status', async () => {
  const orderPayload = {
    fullName: 'Le Thi QR',
    phone: '0912345678',
    province: 'Đà Nẵng',
    district: 'Hải Châu',
    ward: 'Thạch Thang',
    address: '456 Đường Trần Phú',
    variant: 'maker_kit',
    color: 'silver',
    addons: ['dock'],
    quantity: 1,
    paymentMethod: 'vietqr'
  };

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.status, 'PAYMENT_PENDING', 'VietQR order must start as PAYMENT_PENDING');
  assert.strictEqual(data.data.paymentStatus, 'UNPAID', 'VietQR payment status must start as UNPAID');

  const db = getDb();
  const dbOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(data.data.orderId);
  assert.ok(dbOrder);
  assert.strictEqual(dbOrder.payment_status, 'UNPAID');
});

test('Order Transaction: Atomic rollback on invalid payload leaves no orphaned records', async () => {
  const db = getDb();
  const ordersCountBefore = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

  // Invalid phone number triggers validation rejection
  const invalidPayload = {
    fullName: 'Faulty Buyer',
    phone: 'not-a-valid-phone',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng',
    address: '123 Fake Street',
    variant: 'standard',
    color: 'obsidian',
    addons: [],
    quantity: 1,
    paymentMethod: 'cod'
  };

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidPayload)
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);

  const ordersCountAfter = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  assert.strictEqual(ordersCountAfter, ordersCountBefore, 'No order must be inserted on validation failure');
});
