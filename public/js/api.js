/**
 * iPet Client-Side API Connector
 */

const Api = {
  async getProduct() {
    try {
      const res = await fetch('/api/product');
      return await res.json();
    } catch (err) {
      console.error('Error fetching product:', err);
      return { success: false, error: 'Không thể kết nối đến máy chủ' };
    }
  },

  async calculatePricing({ variant, color, quantity, addons, couponCode, paymentMethod }) {
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, color, quantity, addons, couponCode, paymentMethod })
      });
      return await res.json();
    } catch (err) {
      console.error('Error calculating pricing:', err);
      return { success: false, error: 'Lỗi tính giá đơn hàng' };
    }
  },

  async validateCoupon(code, subtotal) {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Lỗi kết nối máy chủ' };
    }
  },

  async createOrder(orderPayload) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Không thể gửi đơn hàng. Vui lòng kiểm tra lại kết nối mạng.' };
    }
  },

  async getOrder(orderId) {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Không thể tra cứu đơn hàng.' };
    }
  },

  async getReviews() {
    try {
      const res = await fetch('/api/reviews');
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Không thể tải đánh giá' };
    }
  },

  async submitReview(reviewData) {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Lỗi gửi đánh giá' };
    }
  }
};

window.iPetApi = Api;
