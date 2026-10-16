const test = require('node:test');
const assert = require('node:assert');
const app = require('../server/server');
const { createAdminToken, verifyAdminToken } = require('../server/routes/admin');

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

test('Security: Direct requests for sensitive files are blocked with 403', async () => {
  const sensitivePaths = [
    '/ipet_data.sqlite',
    '/package.json',
    '/.env',
    '/server/server.js',
    '/server/db/database.js',
    '/tests/api.test.js',
    '/.git/config'
  ];

  for (const path of sensitivePaths) {
    const res = await fetch(`${baseUrl}${path}`);
    assert.strictEqual(
      res.status,
      403,
      `Expected 403 Forbidden for path ${path}, got ${res.status}`
    );
    const text = await res.text();
    assert.match(text, /403 Forbidden|Truy cập bị từ chối/i);
  }
});

test('Security: Mandatory security headers are present on responses', async () => {
  const res = await fetch(`${baseUrl}/api/product`);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.ok(res.headers.get('content-security-policy'));
  assert.ok(res.headers.get('referrer-policy'));
});

test('Security: Admin HMAC-SHA256 tokens authenticate correctly and detect tampering', () => {
  const user = { username: 'testadmin', role: 'superadmin' };
  const token = createAdminToken(user);
  assert.ok(token);

  // Valid token verification
  const decoded = verifyAdminToken(token);
  assert.ok(decoded);
  assert.strictEqual(decoded.username, 'testadmin');
  assert.strictEqual(decoded.role, 'superadmin');

  // Tampered payload verification
  const [b64Payload, signature] = token.split('.');
  const rawPayload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
  rawPayload.role = 'hacked_admin';
  const tamperedPayloadB64 = Buffer.from(JSON.stringify(rawPayload)).toString('base64url');
  const tamperedToken = `${tamperedPayloadB64}.${signature}`;

  const tamperedResult = verifyAdminToken(tamperedToken);
  assert.strictEqual(tamperedResult, null, 'Tampered token must be rejected');

  // Completely invalid token
  assert.strictEqual(verifyAdminToken('invalid.token.here'), null);
  assert.strictEqual(verifyAdminToken(''), null);
  assert.strictEqual(verifyAdminToken(null), null);
});

test('Security: Admin login endpoint enforces rate limiting after threshold', async () => {
  // Use a dedicated distinct IP simulation or repeated attempts
  let hitRateLimit = false;

  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.99' // isolated test client IP
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'incorrect-password-test'
      })
    });

    if (res.status === 429) {
      hitRateLimit = true;
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /thử lại sau/i);
      break;
    }
  }

  assert.strictEqual(hitRateLimit, true, 'Rate limiter must return 429 after threshold');
});
