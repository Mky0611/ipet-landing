/**
 * iPet Production-Grade Server
 * Single-product D2C e-commerce platform backend.
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

// Initialize database schema on startup
getDb();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Static files
const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
app.use(express.static(rootDir));

// Admin Dashboard Route
app.get(/^\/admin/, (req, res) => {
  const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin', 'index.html');
  if (fs.existsSync(adminHtmlPath)) {
    return res.sendFile(adminHtmlPath);
  }
  res.status(404).send('Admin dashboard not found');
});

// Fallback to index.html for SPA client navigation
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
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
