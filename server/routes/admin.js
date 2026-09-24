/**
 * iPet Admin Management API Routes
 * Protected endpoints for order fulfillment, inventory, and reviews.
 */

const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { getDb, hashPassword } = require('../db/database');
const { transitionOrder, ORDER_STATES } = require('../services/orderStateMachine');

// In-memory admin session store (Token -> { username, expiresAt })
const activeSessions = new Map();

function createAdminToken(username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  activeSessions.set(token, { username, expiresAt });
  return token;
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập quản trị viên' });
  }

  const session = activeSessions.get(token);
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ success: false, error: 'Phiên làm việc đã hết hạn' });
  }

  req.adminUser = session.username;
  next();
}

/**
 * POST /api/admin/login
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.password_hash) {
    return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
  }

  const token = createAdminToken(user.username);
  res.json({
    success: true,
    data: {
      token,
      username: user.username,
      role: user.role
    }
  });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
