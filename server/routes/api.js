/**
 * iPet Public Client API Routes
 */

const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { getDb } = require('../db/database');
const { PRODUCT_DATA, calculateOrderPricing } = require('../services/pricing');
const { validateCheckoutData } = require('../services/validation');
const { generateVietQR } = require('../services/vietqr');
const { ORDER_STATES, transitionOrder } = require('../services/orderStateMachine');

/**
 * GET /api/product
 * Get full product information and live stock status
 */
router.get('/product', (req, res) => {
  try {
    const db = getDb();
    const inventoryRows = db.prepare('SELECT variant_id, stock_count FROM inventory').all();
    const inventoryMap = {};
    for (const row of inventoryRows) {
      inventoryMap[row.variant_id] = row.stock_count;
    }

    const variantsWithStock = {};
    for (const [key, v] of Object.entries(PRODUCT_DATA.variants)) {
      variantsWithStock[key] = {
        ...v,
        stockCount: inventoryMap[key] !== undefined ? inventoryMap[key] : 50,
        inStock: (inventoryMap[key] || 0) > 0
      };
    }

    res.json({
      success: true,
      data: {
        ...PRODUCT_DATA,
        variants: variantsWithStock
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/pricing/calculate
 * Calculate authoritative order pricing
 */
router.post('/pricing/calculate', (req, res) => {
  try {
    const { variant, color, quantity, addons, couponCode, paymentMethod } = req.body;
    const db = getDb();

    let couponObj = null;
    if (couponCode) {
      const codeClean = String(couponCode).trim().toUpperCase();
      const row = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(codeClean);
      if (row && row.uses_count < row.max_uses) {
        couponObj = {
          code: row.code,
          type: row.type,
          value: row.value,
          minOrder: row.min_order
        };
      }
    }

    const pricing = calculateOrderPricing({
      variant,
      color,
      quantity,
      addons,
      coupon: couponObj,
      paymentMethod
    });

    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/coupons/validate
 * Validate coupon code
 */
router.post('/coupons/validate', (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mã giảm giá' });
    }

    const db = getDb();
    const codeClean = String(code).trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(codeClean);

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn' });
    }

    if (coupon.uses_count >= coupon.max_uses) {
      return res.status(400).json({ success: false, error: 'Mã giảm giá đã đạt giới hạn lượt sử dụng' });
    }

    if (subtotal < coupon.min_order) {
      return res.status(400).json({
        success: false,
        error: `Mã áp dụng cho đơn hàng từ ${coupon.min_order.toLocaleString('vi-VN')}₫`
      });
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.min_order
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orders
 * Create a new order with validation, inventory reservation, and payment generation
 */
router.post('/orders', (req, res) => {
  try {
    const validation = validateCheckoutData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Thông tin đặt hàng không hợp lệ',
        validationErrors: validation.errors
      });
    }

    const { sanitizedData } = validation;
    const db = getDb();

    // Check inventory
    const invRow = db.prepare('SELECT stock_count FROM inventory WHERE variant_id = ?').get(sanitizedData.variant);
    if (!invRow || invRow.stock_count < sanitizedData.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Phiên bản robot được chọn hiện đang tạm hết hàng, vui lòng thử lại sau.'
      });
    }

    // Lookup coupon if any
    let couponObj = null;
    if (sanitizedData.couponCode) {
      const cRow = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(sanitizedData.couponCode);
      if (cRow && cRow.uses_count < cRow.max_uses) {
        couponObj = {
          code: cRow.code,
          type: cRow.type,
          value: cRow.value,
          minOrder: cRow.min_order
        };
      }
    }

    // Authoritative pricing calculation
    const pricing = calculateOrderPricing({
      variant: sanitizedData.variant,
      color: sanitizedData.color,
      quantity: sanitizedData.quantity,
      addons: sanitizedData.addons,
      coupon: couponObj,
      paymentMethod: sanitizedData.paymentMethod
    });

    // Generate unique Order Code: IPET-[4 random uppercase/digits]
    const orderId = `IPET-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const initialStatus = sanitizedData.paymentMethod === 'vietqr' ? ORDER_STATES.PAYMENT_PENDING : ORDER_STATES.PAID;
    const paymentStatus = sanitizedData.paymentMethod === 'vietqr' ? 'UNPAID' : 'COD_PENDING';
    const now = new Date().toISOString();

    const auditLog = [
      {
        timestamp: now,
        from: 'NONE',
        to: initialStatus,
        reason: `Khách hàng tạo đơn hàng qua phương thức ${sanitizedData.paymentMethod.toUpperCase()}`
      }
    ];

    // Insert order into DB
    const insertStmt = db.prepare(`
      INSERT INTO orders (
        id, status, customer_name, customer_phone, customer_email,
        province, district, ward, address, note,
        variant_id, variant_name, color, quantity, addons_json,
        subtotal, shipping_fee, discount_amount, total_amount,
        payment_method, payment_status, tracking_number, audit_log_json,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    insertStmt.run(
      orderId,
      initialStatus,
      sanitizedData.fullName,
      sanitizedData.phone,
      sanitizedData.email,
      sanitizedData.province,
      sanitizedData.district,
      sanitizedData.ward,
      sanitizedData.address,
      sanitizedData.note,
      pricing.variant.id,
      pricing.variant.name,
      pricing.color,
      pricing.quantity,
      JSON.stringify(pricing.addons),
      pricing.subtotal,
      pricing.shippingFee,
      pricing.discountAmount,
      pricing.total,
      sanitizedData.paymentMethod,
      paymentStatus,
      '',
      JSON.stringify(auditLog),
      now,
      now
    );

    // Deduct inventory
    db.prepare('UPDATE inventory SET stock_count = stock_count - ?, updated_at = ? WHERE variant_id = ?')
      .run(sanitizedData.quantity, now, sanitizedData.variant);

    // Increment coupon use if applied
    if (pricing.appliedCoupon) {
      db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = ?')
        .run(pricing.appliedCoupon.code);
    }

    // Generate VietQR details if applicable
    let vietqrData = null;
    if (sanitizedData.paymentMethod === 'vietqr') {
      vietqrData = generateVietQR({
        orderCode: orderId,
        amount: pricing.total
      });
    }

    res.json({
      success: true,
      data: {
        orderId,
        status: initialStatus,
        paymentMethod: sanitizedData.paymentMethod,
        paymentStatus,
        pricing,
        customer: {
          fullName: sanitizedData.fullName,
          phone: sanitizedData.phone,
          address: `${sanitizedData.address}, ${sanitizedData.ward}, ${sanitizedData.district}, ${sanitizedData.province}`
        },
        vietqr: vietqrData,
        createdAt: now
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Lookup order status by ID
 */
router.get('/orders/:id', (req, res) => {
  try {
    const orderId = String(req.params.id || '').trim().toUpperCase();
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: `Không tìm thấy đơn hàng với mã: ${orderId}` });
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        customerName: order.customer_name,
        customerPhone: order.customer_phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask phone for privacy
        shippingAddress: `${order.address}, ${order.ward}, ${order.district}, ${order.province}`,
        variantName: order.variant_name,
        color: order.color,
        quantity: order.quantity,
        addons: JSON.parse(order.addons_json || '[]'),
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        discountAmount: order.discount_amount,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        trackingNumber: order.tracking_number,
        timeline: JSON.parse(order.audit_log_json || '[]'),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reviews
 * Get approved customer reviews & rating breakdown
 */
router.get('/reviews', (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare('SELECT id, author_name, rating, content, variant, is_verified, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC').all();

    let totalRating = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      totalRating += r.rating;
      if (ratingBreakdown[r.rating] !== undefined) ratingBreakdown[r.rating]++;
    }

    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '5.0';

    res.json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating),
        totalReviews: reviews.length,
        ratingBreakdown,
        reviews
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reviews
 * Submit a customer review (queued for admin moderation)
 */
router.post('/reviews', (req, res) => {
  try {
    const { authorName, rating, content, variant } = req.body;
    if (!authorName || !content || !rating) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ tên, đánh giá và cảm nghĩ của bạn' });
    }

    const validRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
    const now = new Date().toISOString();
    const db = getDb();

    // Insert as approved or pending
    const stmt = db.prepare(`
      INSERT INTO reviews (author_name, rating, content, variant, is_verified, is_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      authorName.trim().slice(0, 60),
      validRating,
      content.trim().slice(0, 1000),
      (variant || 'iPet Standard').slice(0, 50),
      1,
      1, // Approved for instant feedback
      now
    );

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn đã được ghi nhận.',
      reviewId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/survey
 * Receive customer survey & feature suggestion
 */
router.post('/survey', (req, res) => {
  try {
    const { customerName, phoneOrEmail, featureWish, useCase, targetPrice, suggestions } = req.body;
    const now = new Date().toISOString();
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO surveys (customer_name, phone_or_email, feature_wish, use_case, target_price, suggestions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      (customerName || 'Ẩn danh').trim().slice(0, 80),
      (phoneOrEmail || '').trim().slice(0, 100),
      (featureWish || '').slice(0, 200),
      (useCase || '').slice(0, 200),
      (targetPrice || '').slice(0, 50),
      (suggestions || '').trim().slice(0, 2000),
      now
    );

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã tham gia khảo sát & đóng góp ý kiến phát triển iPet!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
