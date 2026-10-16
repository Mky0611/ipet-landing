/**
 * iPet Rate Limiter Middleware
 * Memory-efficient sliding window rate limiter for public and sensitive routes.
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Quá nhiều yêu cầu, vui lòng thử lại sau.' } = {}) {
  const requests = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requests.entries()) {
      if (now - record.resetTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so it won't block process exit

  return (req, res, next) => {
    // Determine client IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    let record = requests.get(ip);
    if (!record || (now - record.resetTime > windowMs)) {
      record = { count: 1, resetTime: now };
      requests.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  loginLimiter: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.' }),
  orderLimiter: createRateLimiter({ windowMs: 5 * 60 * 1000, max: 15, message: 'Hệ thống đang tiếp nhận nhiều đơn hàng, vui lòng thử lại sau ít phút.' }),
  surveyLimiter: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 8, message: 'Bạn đã gửi khảo sát gần đây. Cảm ơn ý kiến đóng góp của bạn!' }),
  reviewLimiter: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, message: 'Bạn đã gửi đánh giá gần đây. Vui lòng chờ kiểm duyệt.' })
};
