/**
 * iPet Admin Management API Routes
 * Protected endpoints with stateless signed HMAC tokens, rate limiting, and audit logging.
 */

const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { getDb, hashPassword } = require('../db/database');
const { transitionOrder, ORDER_STATES } = require('../services/orderStateMachine');
const { loginLimiter } = require('../middleware/rateLimiter');

// Secret for HMAC token signing (falls back to stable random seed if not in env)
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'ipet_admin_hmac_secret_2026_d2c';

/**
 * Generate stateless signed HMAC token
 */
function createAdminToken(usernameOrUser, maybeRole = 'admin') {
  const username = typeof usernameOrUser === 'object' && usernameOrUser !== null ? usernameOrUser.username : usernameOrUser;
  const role = typeof usernameOrUser === 'object' && usernameOrUser !== null ? (usernameOrUser.role || 'admin') : maybeRole;

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    username,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Verify stateless signed HMAC token
 */
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > data.exp) return null; // Expired
    return data;
  } catch {
    return null;
  }
}

/**
 * Middleware: Require valid Admin authorization
 */
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập quản trị viên' });
  }

  const session = verifyAdminToken(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn' });
  }

  req.adminUser = session.username;
  req.adminRole = session.role;
  next();
}

/**
 * POST /api/admin/login
 * Rate limited to 5 attempts per 15 minutes per IP
 */
router.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(cleanUsername);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const computedHash = hashPassword(cleanPassword, user.salt);
    const hashBuf = Buffer.from(computedHash, 'hex');
    const userHashBuf = Buffer.from(user.password_hash, 'hex');

    if (hashBuf.length !== userHashBuf.length || !crypto.timingSafeEqual(hashBuf, userHashBuf)) {
      return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = createAdminToken(user.username, user.role);
    res.json({
      success: true,
      data: {
        token,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    res.status(500).json({ success: false, error: 'Lỗi đăng nhập hệ thống' });
  }
});

/**
 * GET /api/admin/stats
 */
router.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const orders = db.prepare('SELECT status, total_amount, payment_status FROM orders').all();
    const inv = db.prepare('SELECT * FROM inventory').all();

    let totalRevenue = 0;
    let paidOrders = 0;
    const statusCounts = {};

    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      if (['PAID', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(o.status)) {
        totalRevenue += o.total_amount;
        paidOrders++;
      }
    }

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        paidOrders,
        totalRevenue,
        statusCounts,
        inventory: inv
      }
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err);
    res.status(500).json({ success: false, error: 'Lỗi nạp thống kê' });
  }
});

/**
 * GET /api/admin/orders
 */
router.get('/orders', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const orders = db.prepare(query).all(...params);

    const formatted = orders.map(o => ({
      ...o,
      addons: JSON.parse(o.addons_json || '[]'),
      auditLog: JSON.parse(o.audit_log_json || '[]')
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('[Admin Orders Error]:', err);
    res.status(500).json({ success: false, error: 'Lỗi tải danh sách đơn hàng' });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 */
router.patch('/orders/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { nextStatus, reason = '' } = req.body;
    const orderId = req.params.id;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' });
    }

    const check = transitionOrder(order.status, nextStatus, reason);
    if (!check.success) {
      return res.status(400).json({ success: false, error: check.error });
    }

    const now = new Date().toISOString();
    const auditLog = JSON.parse(order.audit_log_json || '[]');
    auditLog.push({
      timestamp: now,
      from: order.status,
      to: nextStatus,
      by: req.adminUser,
      reason: reason || `Admin cập nhật trạng thái sang ${nextStatus}`
    });

    let paymentStatus = order.payment_status;
    if (nextStatus === ORDER_STATES.PAID || nextStatus === ORDER_STATES.PROCESSING) {
      paymentStatus = 'PAID';
    } else if (nextStatus === ORDER_STATES.REFUNDED) {
      paymentStatus = 'REFUNDED';
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, payment_status = ?, audit_log_json = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, paymentStatus, JSON.stringify(auditLog), now, orderId);

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng ${orderId} sang ${nextStatus}`,
      data: { orderId, status: nextStatus, paymentStatus }
    });
  } catch (err) {
    console.error('[Admin Order Status Error]:', err);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật đơn hàng' });
  }
});

/**
 * PATCH /api/admin/orders/:id/tracking
 */
router.patch('/orders/:id/tracking', requireAdminAuth, (req, res) => {
  try {
    const { trackingNumber } = req.body;
    const orderId = req.params.id;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE orders SET tracking_number = ?, updated_at = ? WHERE id = ?')
      .run(String(trackingNumber || '').trim(), now, orderId);

    res.json({ success: true, message: 'Đã cập nhật mã vận đơn' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi cập nhật mã vận đơn' });
  }
});

/**
 * GET /api/admin/inventory
 */
router.get('/inventory', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM inventory').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi tải tồn kho' });
  }
});

/**
 * PATCH /api/admin/inventory
 */
router.patch('/inventory', requireAdminAuth, (req, res) => {
  try {
    const { variantId, stockCount } = req.body;
    const count = parseInt(stockCount, 10);
    if (isNaN(count) || count < 0) {
      return res.status(400).json({ success: false, error: 'Số lượng kho không hợp lệ' });
    }

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE inventory SET stock_count = ?, updated_at = ? WHERE variant_id = ?')
      .run(count, now, variantId);

    res.json({ success: true, message: `Đã cập nhật kho phiên bản ${variantId} thành ${count}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi cập nhật tồn kho' });
  }
});

/**
 * GET /api/admin/reviews
 */
router.get('/reviews', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi tải đánh giá' });
  }
});

/**
 * PATCH /api/admin/reviews/:id/status
 */
router.patch('/reviews/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { isApproved } = req.body;
    const reviewId = req.params.id;
    const db = getDb();

    db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?')
      .run(isApproved ? 1 : 0, reviewId);

    res.json({ success: true, message: `Đã cập nhật trạng thái duyệt đánh giá #${reviewId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi duyệt đánh giá' });
  }
});

/**
 * GET /api/admin/coupons
 */
router.get('/coupons', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi tải mã giảm giá' });
  }
});

/**
 * POST /api/admin/coupons
 */
router.post('/coupons', requireAdminAuth, (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses } = req.body;
    if (!code || !type || !value) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin mã khuyến mãi' });
    }

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_uses, uses_count, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 1, ?)
    `).run(
      code.trim().toUpperCase(),
      type,
      parseFloat(value),
      parseFloat(minOrder || 0),
      parseInt(maxUses || 100, 10),
      now
    );

    res.json({ success: true, message: 'Đã tạo mã giảm giá thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi tạo mã giảm giá' });
  }
});

module.exports = router;
module.exports.createAdminToken = createAdminToken;
module.exports.verifyAdminToken = verifyAdminToken;
module.exports.requireAdminAuth = requireAdminAuth;
