/**
 * iPet Input & Checkout Validation Service
 */

const { PRODUCT_DATA } = require('./pricing');

/**
 * Validate Vietnamese phone number
 * Accepts formats: 0912345678, +84912345678, 03xxxxxxxx, 05xxxxxxxx, 07xxxxxxxx, 08xxxxxxxx
 */
function isValidVietnamesePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
  const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return vnPhoneRegex.test(cleanPhone);
}

/**
 * Validate checkout request payload
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Object, sanitizedData: Object }}
 */
function validateCheckoutData(data) {
  const errors = {};
  const sanitized = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { form: 'Dữ liệu đơn hàng không hợp lệ' }, sanitizedData: {} };
  }

  // 1. Full name
  const fullName = (data.fullName || '').trim();
  if (!fullName || fullName.length < 2) {
    errors.fullName = 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự)';
  } else if (fullName.length > 80) {
    errors.fullName = 'Họ tên quá dài (tối đa 80 ký tự)';
  } else {
    sanitized.fullName = fullName;
  }

  // 2. Phone
  const phone = (data.phone || '').trim().replace(/[\s.-]/g, '');
  if (!isValidVietnamesePhone(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng di động Việt Nam (ví dụ: 0912345678)';
  } else {
    sanitized.phone = phone;
  }

  // 3. Email (optional)
  const email = (data.email || '').trim().toLowerCase();
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Địa chỉ email không đúng định dạng';
    } else {
      sanitized.email = email;
    }
  } else {
    sanitized.email = '';
  }

  // 4. Address fields
  const province = (data.province || '').trim();
  const district = (data.district || '').trim();
  const ward = (data.ward || '').trim();
  const address = (data.address || '').trim();

  if (!province) errors.province = 'Vui lòng chọn Tỉnh / Thành phố';
  else sanitized.province = province;

  if (!district) errors.district = 'Vui lòng chọn Quận / Huyện';
  else sanitized.district = district;

  if (!ward) errors.ward = 'Vui lòng chọn Phường / Xã';
  else sanitized.ward = ward;

  if (!address || address.length < 5) {
    errors.address = 'Vui lòng nhập địa chỉ giao hàng cụ thể (tên đường, số nhà)';
  } else {
    sanitized.address = address;
  }

  // 5. Note
  sanitized.note = (data.note || '').trim().slice(0, 500);

  // 6. Product variant
  const variant = data.variant || 'standard';
  if (!PRODUCT_DATA.variants[variant]) {
    errors.variant = 'Phiên bản iPet được chọn không hợp lệ';
  } else {
    sanitized.variant = variant;
  }

  // 7. Color
  const color = data.color || 'obsidian';
  if (!PRODUCT_DATA.colors[color]) {
    sanitized.color = 'obsidian';
  } else {
    sanitized.color = color;
  }

  // 8. Quantity
  const qty = parseInt(data.quantity, 10);
  if (isNaN(qty) || qty < 1 || qty > 10) {
    errors.quantity = 'Số lượng phải từ 1 đến 10 robot';
  } else {
    sanitized.quantity = qty;
  }

  // 9. Addons
  sanitized.addons = Array.isArray(data.addons) 
    ? data.addons.filter(id => !!PRODUCT_DATA.addons[id])
    : [];

  // 10. Payment Method
  const paymentMethod = data.paymentMethod || 'vietqr';
  if (!['vietqr', 'cod'].includes(paymentMethod)) {
    errors.paymentMethod = 'Phương thức thanh toán phải là VietQR hoặc COD';
  } else {
    sanitized.paymentMethod = paymentMethod;
  }

  // 11. Coupon code
  sanitized.couponCode = (data.couponCode || '').trim().toUpperCase();

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: sanitized
  };
}

module.exports = {
  isValidVietnamesePhone,
  validateCheckoutData
};
