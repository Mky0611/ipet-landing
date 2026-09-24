/**
 * iPet Pricing Service - Single Source of Truth
 * Used by both Backend and mirrored to Frontend for exact parity.
 */

const PRODUCT_DATA = {
  id: 'ipet-robot',
  name: 'iPet — AI Companion Robot',
  basePrice: 1490000,
  variants: {
    standard: {
      id: 'standard',
      name: 'iPet Standard',
      description: 'Robot hoàn chỉnh lắp ráp sẵn, phụ kiện sạc Type-C, bảo hành chính hãng.',
      price: 1490000,
      inStock: true
    },
    maker_kit: {
      id: 'maker_kit',
      name: 'iPet Maker / Dev Kit',
      description: 'Bộ linh kiện rời kèm mã nguồn ESP-IDF/Arduino, tài liệu tự lắp ráp cho học sinh - sinh viên.',
      price: 1290000,
      inStock: true
    },
    cyber_pro: {
      id: 'cyber_pro',
      name: 'iPet Cyber Pro',
      description: 'Vỏ trong suốt Cyberpunk, trạm sạc từ tính thông minh, quyền truy cập SDK nâng cao.',
      price: 1890000,
      inStock: true
    }
  },
  colors: {
    obsidian: { id: 'obsidian', name: 'Đen Obsidian (Matte Black)', hex: '#111318' },
    silver: { id: 'silver', name: 'Bạc Titan (Cyber Silver)', hex: '#D1D5DB' },
    electric_blue: { id: 'electric_blue', name: 'Xanh Điện Tử (Electric Cyan)', hex: '#0066FF' }
  },
  addons: {
    dock: {
      id: 'dock',
      name: 'Đế sạc từ tính thông minh (Magnetic Dock)',
      price: 250000
    },
    shell_pack: {
      id: 'shell_pack',
      name: 'Bộ ốp vỏ thay thế đa màu',
      price: 99000
    },
    extended_warranty: {
      id: 'extended_warranty',
      name: 'Bảo hành vàng 1 đổi 1 trong 12 tháng',
      price: 150000
    }
  },
  shippingRules: {
    standardFee: 30000,
    freeShippingThreshold: 1000000 // Miễn phí vận chuyển từ 1 triệu đồng
  }
};

/**
 * Calculate order pricing authoritative breakdown
 * @param {Object} params
 * @param {string} params.variant - variant key ('standard' | 'maker_kit' | 'cyber_pro')
 * @param {string} params.color - color key
 * @param {number} params.quantity - integer >= 1
 * @param {string[]} params.addons - array of addon keys
 * @param {Object|null} params.coupon - coupon object with { code, type: 'percent'|'fixed', value, minOrder }
 * @param {string} params.paymentMethod - 'vietqr' | 'cod'
 * @returns {Object} Price breakdown
 */
function calculateOrderPricing({ variant = 'standard', color = 'obsidian', quantity = 1, addons = [], coupon = null, paymentMethod = 'vietqr' }) {
  const selectedVariant = PRODUCT_DATA.variants[variant];
  if (!selectedVariant) {
    throw new Error(`Phiên bản sản phẩm không hợp lệ: ${variant}`);
  }

  const validQuantity = Math.max(1, parseInt(quantity, 10) || 1);

  // Variant subtotal
  const variantUnitPrice = selectedVariant.price;
  const variantSubtotal = variantUnitPrice * validQuantity;

  // Addons subtotal
  let addonsSubtotal = 0;
  const validAddonsList = [];
  if (Array.isArray(addons)) {
    for (const addonId of addons) {
      const addon = PRODUCT_DATA.addons[addonId];
      if (addon) {
        addonsSubtotal += addon.price * validQuantity;
        validAddonsList.push({ id: addon.id, name: addon.name, price: addon.price });
      }
    }
  }

  // Items total before discounts & shipping
  const subtotal = variantSubtotal + addonsSubtotal;

  // Shipping calculation
  const shippingFee = subtotal >= PRODUCT_DATA.shippingRules.freeShippingThreshold ? 0 : PRODUCT_DATA.shippingRules.standardFee;

  // Coupon discount calculation
  let discountAmount = 0;
  let appliedCoupon = null;

  if (coupon && coupon.code) {
    const minOrder = coupon.minOrder || 0;
    if (subtotal >= minOrder) {
      if (coupon.type === 'percent') {
        const percent = Math.min(100, Math.max(0, Number(coupon.value) || 0));
        discountAmount = Math.round((subtotal * percent) / 100);
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(subtotal, Math.max(0, Number(coupon.value) || 0));
      }
      appliedCoupon = {
        code: coupon.code,
        discount: discountAmount
      };
    }
  }

  // Payment method discount (e.g., 30,000đ incentive for VietQR instant payment vs COD)
  let paymentDiscount = 0;
  if (paymentMethod === 'vietqr' && shippingFee > 0) {
    // If shipping was charged, VietQR waives shipping
    paymentDiscount = shippingFee;
  }

  const total = Math.max(0, subtotal + shippingFee - discountAmount - paymentDiscount);

  return {
    variant: {
      id: selectedVariant.id,
      name: selectedVariant.name,
      unitPrice: variantUnitPrice
    },
    color: PRODUCT_DATA.colors[color] ? PRODUCT_DATA.colors[color].name : color,
    quantity: validQuantity,
    addons: validAddonsList,
    variantSubtotal,
    addonsSubtotal,
    subtotal,
    shippingFee,
    discountAmount,
    paymentDiscount,
    appliedCoupon,
    paymentMethod,
    total
  };
}

module.exports = {
  PRODUCT_DATA,
  calculateOrderPricing
};
