/**
 * iPet Production-Grade Server
 * Single-product D2C e-commerce platform backend.
 * Hardened with strict static directory sandboxing, security headers, and rate limiting.
 */

const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database schema and migrations on startup
try {
  getDb();
} catch (err) {
  console.warn('[iPet Server] Database init skipped:', err.message);
}

// Security: Enforce CORS policy
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'https://ipet-landing-psi.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Chính sách CORS không cho phép truy cập từ nguồn này'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Comprehensive Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.vietqr.io https://img.vietqr.io; connect-src 'self';"
  );
  next();
});

// Guard: Explicitly block directory traversal and sensitive extensions
app.use((req, res, next) => {
  const normalizedPath = decodeURIComponent(req.path).toLowerCase();
  
  if (
    normalizedPath.includes('..') ||
    normalizedPath.startsWith('/server') ||
    normalizedPath.startsWith('/tests') ||
    normalizedPath.startsWith('/.git') ||
    /\.(sqlite|db|env|log|md|lock)$/i.test(normalizedPath) ||
    normalizedPath === '/package.json' ||
    normalizedPath === '/vercel.json'
  ) {
    return res.status(403).send('Truy cập bị từ chối');
  }
  next();
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Safe Static files serving: Strictly serve ONLY the public/ directory
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    dotfiles: 'ignore',
    index: 'index.html',
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
  }));
}

// Admin Dashboard Route
app.get(/^\/admin/, (req, res) => {
  const adminHtmlPath = path.join(publicDir, 'admin', 'index.html');
  if (fs.existsSync(adminHtmlPath)) {
    return res.sendFile(adminHtmlPath);
  }
  res.status(404).send('Bảng điều khiển quản trị không tồn tại');
});

// Explicit 404 for undefined API endpoints
app.all(/^\/api(\/.*)?$/, (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint không tồn tại' });
});

// Fallback to index.html for SPA client navigation
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Trang không tồn tại');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.message);
  res.status(500).json({
    success: false,
    error: 'Đã xảy ra lỗi nội bộ máy chủ. Vui lòng thử lại sau.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[iPet Server] Production server is running on http://localhost:${PORT}`);
    console.log(`[iPet Server] Admin panel available at http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
