/**
 * iPet Cart Drawer Management
 * Slide-over drawer on desktop, smooth bottom sheet on mobile.
 */

class CartManager {
  constructor() {
    this.items = this.loadCart();
    this.couponCode = localStorage.getItem('ipet_coupon') || '';
    this.appliedCoupon = null;

    this.drawer = document.getElementById('cart-drawer');
    this.backdrop = document.getElementById('cart-backdrop');
    this.cartBadge = document.getElementById('nav-cart-badge');

    this.init();
  }

  loadCart() {
    try {
      const saved = localStorage.getItem('ipet_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem('ipet_cart', JSON.stringify(this.items));
    } catch (e) {}
    this.render();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Open cart button in header
    const btnOpenCart = document.getElementById('btn-open-cart');
    if (btnOpenCart) {
      btnOpenCart.addEventListener('click', () => this.openCart());
    }

    // Close buttons
    const btnCloseCart = document.getElementById('btn-close-cart');
    if (btnCloseCart) {
      btnCloseCart.addEventListener('click', () => this.closeCart());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.closeCart());
    }

    // ESC key close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.closeCart();
      }
    });

    // Apply coupon form
    const couponForm = document.getElementById('cart-coupon-form');
    if (couponForm) {
      couponForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('cart-coupon-input');
        const code = input ? input.value.trim().toUpperCase() : '';
        await this.applyCoupon(code);
      });
    }

    // Proceed to checkout CTA
    const btnCheckout = document.getElementById('btn-cart-checkout');
    if (btnCheckout) {
      btnCheckout.addEventListener('click', () => {
        this.closeCart();
        this.openCheckoutModal();
      });
    }
  }

  isOpen() {
    return this.drawer && this.drawer.classList.contains('open');
  }

  openCart() {
    if (!this.drawer || !this.backdrop) return;
    this.drawer.classList.add('open');
    this.backdrop.classList.add('open');
    if (window.motionSystem) window.motionSystem.lockScroll();
    if (window.trackEvent) window.trackEvent('cart_open');
  }

  closeCart() {
    if (!this.drawer || !this.backdrop) return;
    this.drawer.classList.remove('open');
    this.backdrop.classList.remove('open');
    if (window.motionSystem) window.motionSystem.unlockScroll();
  }

  addItem(item) {
    // Find if identical item exists (same variant, color, addons)
    const sortedAddons = [...(item.addons || [])].sort().join(',');
    const existingIndex = this.items.findIndex(i => {
      const iAddons = [...(i.addons || [])].sort().join(',');
      return i.variant === item.variant && i.color === item.color && iAddons === sortedAddons;
    });

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += item.quantity;
    } else {
      this.items.push({
        id: `item_${Date.now()}`,
        variant: item.variant,
        color: item.color,
        quantity: item.quantity,
        addons: item.addons || []
      });
    }

    this.saveCart();
    this.openCart();

    if (window.trackEvent) {
      window.trackEvent('add_to_cart', { variant: item.variant, quantity: item.quantity });
    }
  }

  updateQuantity(itemId, delta) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.items = this.items.filter(i => i.id !== itemId);
    }
    this.saveCart();
    if (window.motionSystem) window.motionSystem.playHaptic('click');
  }

  removeItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.saveCart();
    if (window.motionSystem) window.motionSystem.playHaptic('click');
  }

  async applyCoupon(code) {
    if (!code) return;
    const msgEl = document.getElementById('coupon-message');

    if (window.iPetApi) {
      const subtotal = this.calculateSubtotal();
      const res = await window.iPetApi.validateCoupon(code, subtotal);
      if (res.success) {
        this.appliedCoupon = res.data;
        this.couponCode = code;
        localStorage.setItem('ipet_coupon', code);
        if (msgEl) {
          msgEl.textContent = `Áp dụng mã ${code} thành công! Giảm ${res.data.type === 'percent' ? `${res.data.value}%` : `${res.data.value.toLocaleString('vi-VN')}₫`}`;
          msgEl.className = 'coupon-msg success';
        }
      } else {
        if (msgEl) {
          msgEl.textContent = res.error;
          msgEl.className = 'coupon-msg error';
        }
      }
    }
    this.render();
  }

  calculateSubtotal() {
    const variantPrices = { standard: 1490000, maker_kit: 1290000, cyber_pro: 1890000 };
    const addonPrices = { dock: 250000, shell_pack: 99000, extended_warranty: 150000 };

    let sum = 0;
    this.items.forEach(i => {
      const vPrice = variantPrices[i.variant] || 1490000;
      let aPrice = 0;
      (i.addons || []).forEach(aId => { aPrice += (addonPrices[aId] || 0); });
      sum += (vPrice + aPrice) * i.quantity;
    });
    return sum;
  }

  render() {
    const listEl = document.getElementById('cart-items-list');
    const emptyEl = document.getElementById('cart-empty-state');
    const footerEl = document.getElementById('cart-footer');
    const countBadge = this.cartBadge;

    const totalQty = this.items.reduce((acc, i) => acc + i.quantity, 0);
    if (countBadge) {
      countBadge.textContent = totalQty;
      countBadge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }

    if (this.items.length === 0) {
      if (listEl) listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    const variantNames = {
      standard: 'iPet Standard',
      maker_kit: 'iPet Maker / Dev Kit',
      cyber_pro: 'iPet Cyber Pro'
    };
    const colorNames = {
      obsidian: 'Đen Obsidian',
      silver: 'Bạc Titan',
      electric_blue: 'Xanh Điện Tử'
    };
    const addonNames = {
      dock: 'Đế sạc từ tính',
      shell_pack: 'Bộ ốp vỏ thay thế',
      extended_warranty: 'Bảo hành vàng 12T'
    };
    const variantPrices = { standard: 1490000, maker_kit: 1290000, cyber_pro: 1890000 };
    const addonPrices = { dock: 250000, shell_pack: 99000, extended_warranty: 150000 };

    if (listEl) {
      listEl.innerHTML = this.items.map(item => {
        const uPrice = variantPrices[item.variant] || 1490000;
        let aTotal = 0;
        (item.addons || []).forEach(a => aTotal += (addonPrices[a] || 0));
        const itemLineTotal = (uPrice + aTotal) * item.quantity;

        return `
          <div class="cart-item">
            <div class="cart-item-info">
              <h4>${variantNames[item.variant] || item.variant}</h4>
              <div class="cart-item-meta">
                <span>Màu: ${colorNames[item.color] || item.color}</span>
                ${(item.addons && item.addons.length > 0) ? `
                  <div class="cart-addons-tags">
                    ${item.addons.map(a => `<span class="addon-tag">+ ${addonNames[a] || a}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
              <div class="cart-item-price">${itemLineTotal.toLocaleString('vi-VN')} ₫</div>
            </div>
            <div class="cart-item-actions">
              <div class="qty-control-mini">
                <button onclick="window.cartManager.updateQuantity('${item.id}', -1)" aria-label="Giảm số lượng">-</button>
                <span>${item.quantity}</span>
                <button onclick="window.cartManager.updateQuantity('${item.id}', 1)" aria-label="Tăng số lượng">+</button>
              </div>
              <button class="btn-remove-item" onclick="window.cartManager.removeItem('${item.id}')" aria-label="Xóa sản phẩm">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Totals & Freeship progress
    const subtotal = this.calculateSubtotal();
    const freeshipThreshold = 1000000;
    const isFreeship = subtotal >= freeshipThreshold;
    const progressPercent = Math.min(100, Math.round((subtotal / freeshipThreshold) * 100));

    const progressEl = document.getElementById('freeship-bar-fill');
    const freeshipText = document.getElementById('freeship-text');

    if (progressEl) progressEl.style.width = `${progressPercent}%`;
    if (freeshipText) {
      if (isFreeship) {
        freeshipText.innerHTML = '<span class="text-green">✓ Bạn đã được Miễn Phí Vận Chuyển toàn quốc!</span>';
      } else {
        const remaining = (freeshipThreshold - subtotal).toLocaleString('vi-VN');
        freeshipText.innerHTML = `Mua thêm <strong>${remaining} ₫</strong> để nhận Freeship toàn quốc!`;
      }
    }

    // Discount
    let discount = 0;
    if (this.appliedCoupon) {
      if (this.appliedCoupon.type === 'percent') {
        discount = Math.round((subtotal * this.appliedCoupon.value) / 100);
      } else {
        discount = Math.min(subtotal, this.appliedCoupon.value);
      }
    }

    const shipping = isFreeship ? 0 : 30000;
    const total = Math.max(0, subtotal + shipping - discount);

    const subtotalEl = document.getElementById('cart-subtotal-val');
    const shippingEl = document.getElementById('cart-shipping-val');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount-val');
    const totalEl = document.getElementById('cart-total-val');

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString('vi-VN')} ₫`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'MIỄN PHÍ' : `${shipping.toLocaleString('vi-VN')} ₫`;
    if (discountRow) {
      discountRow.style.display = discount > 0 ? 'flex' : 'none';
      if (discountEl) discountEl.textContent = `-${discount.toLocaleString('vi-VN')} ₫`;
    }
    if (totalEl) totalEl.textContent = `${total.toLocaleString('vi-VN')} ₫`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  openCheckoutModal() {
    if (this.items.length === 0) return;
    if (window.checkoutFlow) {
      window.checkoutFlow.open(this.items[0], this.appliedCoupon);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cartManager = new CartManager();
});
