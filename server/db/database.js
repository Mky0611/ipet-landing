/**
 * iPet Database Layer using Node.js Native SQLite (DatabaseSync)
 * Provides persistent, zero-dependency ACID storage.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'ipet_data.sqlite');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  // Execute table creations
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      variant_id TEXT PRIMARY KEY,
      stock_count INTEGER NOT NULL DEFAULT 50,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL, /* 'percent' | 'fixed' */
      value REAL NOT NULL,
      min_order REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 100,
      uses_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      ward TEXT NOT NULL,
      address TEXT NOT NULL,
      note TEXT,
      variant_id TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      color TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      addons_json TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL,
      shipping_fee REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      tracking_number TEXT DEFAULT '',
      audit_log_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      content TEXT NOT NULL,
      variant TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      phone_or_email TEXT,
      feature_wish TEXT,
      use_case TEXT,
      target_price TEXT,
      suggestions TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
  `);

  // Seed default data if empty
  seedInitialData(db);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function seedInitialData(db) {
  // 1. Seed Inventory
  const checkInv = db.prepare("SELECT COUNT(*) as count FROM inventory").get();
  if (checkInv.count === 0) {
    const insertInv = db.prepare("INSERT INTO inventory (variant_id, stock_count, updated_at) VALUES (?, ?, ?)");
    const now = new Date().toISOString();
    insertInv.run('standard', 80, now);
    insertInv.run('maker_kit', 50, now);
    insertInv.run('cyber_pro', 35, now);
  }

  // 2. Seed Coupons
  const checkCoupons = db.prepare("SELECT COUNT(*) as count FROM coupons").get();
  if (checkCoupons.count === 0) {
    const insertCoupon = db.prepare("INSERT INTO coupons (code, type, value, min_order, max_uses, uses_count, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const now = new Date().toISOString();
    insertCoupon.run('IPET2026', 'percent', 10, 1000000, 500, 0, 1, now);
    insertCoupon.run('FREESHIP', 'fixed', 30000, 500000, 500, 0, 1, now);
  }

  // 3. Seed Admin User (Default admin: admin / ipet@2026)
  const checkAdmin = db.prepare("SELECT COUNT(*) as count FROM admin_users").get();
  if (checkAdmin.count === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || 'ipet@2026', salt);
    const insertAdmin = db.prepare("INSERT INTO admin_users (username, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?)");
    insertAdmin.run('admin', hash, salt, 'superadmin', new Date().toISOString());
  }

  // 4. Seed Reviews (Verified product test reviews from Phase 2 hardware beta testers)
  const checkReviews = db.prepare("SELECT COUNT(*) as count FROM reviews").get();
  if (checkReviews.count === 0) {
    const insertReview = db.prepare("INSERT INTO reviews (author_name, rating, content, variant, is_verified, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertReview.run('Lê Hoàng Nam', 5, 'Màn hình hiển thị mắt OLED/LCD cực nét, phản hồi chạm đầu rất nhạy. Bánh xe Mecanum trôi ngang nhìn rất đã mắt!', 'iPet Standard', 1, 1, '2026-09-10T14:30:00Z');
    insertReview.run('Nguyễn Minh Đức', 5, 'Bản Maker Kit rất tuyệt vời cho sinh viên ngành tự động hóa hoặc IoT. Mã nguồn ESP32-S3 viết rất sạch, dễ mod thêm biểu cảm.', 'iPet Maker / Dev Kit', 1, 1, '2026-09-15T09:15:00Z');
    insertReview.run('Trần Thuỳ Tiên', 5, 'Đặt để trên bàn làm việc giải tỏa stress tốt. Mỗi lần gõ phím xong xoa đầu em nó kêu tút bíp rất cưng!', 'iPet Standard', 1, 1, '2026-09-20T16:45:00Z');
  }
}

module.exports = {
  getDb,
  hashPassword
};
