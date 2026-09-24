/**
 * iPet Single-Product Configurator
 * Synchronizes variant selection, color, addons, and live pricing.
 */

class ProductConfigurator {
  constructor() {
    this.selectedVariant = 'standard';
    this.selectedColor = 'obsidian';
    this.selectedAddons = new Set();
    this.quantity = 1;

    this.productData = null;
    this.init();
  }

  async init() {
    // Fetch live product data from backend
    if (window.iPetApi) {
      const res = await window.iPetApi.getProduct();
      if (res.success) {
        this.productData = res.data;
        this.updateStockBadges();
      }
    }

    this.bindEvents();
    this.updatePricing();
    this.initStickyBar();
  }

  updateStockBadges() {
    if (!this.productData || !this.productData.variants) return;
    for (const [key, v] of Object.entries(this.productData.variants)) {
      const badge = document.querySelector(`.variant-card[data-variant="${key}"] .stock-tag`);
      if (badge) {
        badge.textContent = v.inStock ? `Còn ${v.stockCount} máy` : 'Tạm hết hàng';
        badge.classList.toggle('out-of-stock', !v.inStock);
      }
    }
  }

  bindEvents() {
    // 1. Variant selection
    document.querySelectorAll('.variant-card').forEach(card => {
      card.addEventListener('click', () => {
        const variant = card.getAttribute('data-variant');
        this.setVariant(variant);
      });
    });

    // 2. Color selection
    document.querySelectorAll('.config-color-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const color = opt.getAttribute('data-color');
        this.setColor(color);
      });
    });

    // 3. Addons checkboxes
    document.querySelectorAll('.addon-checkbox').forEach(chk => {
      chk.addEventListener('change', () => {
        const addonId = chk.value;
        if (chk.checked) this.selectedAddons.add(addonId);
        else this.selectedAddons.delete(addonId);
        this.updatePricing();
        if (window.motionSystem) window.motionSystem.playHaptic('click');
      });
    });

    // 4. Quantity buttons
    const btnMinus = document.getElementById('btn-qty-minus');
    const btnPlus = document.getElementById('btn-qty-plus');
    const inputQty = document.getElementById('input-qty');

    if (btnMinus && btnPlus && inputQty) {
      btnMinus.addEventListener('click', () => {
        if (this.quantity > 1) {
          this.quantity--;
          inputQty.value = this.quantity;
          this.updatePricing();
          if (window.motionSystem) window.motionSystem.playHaptic('click');
        }
      });
      btnPlus.addEventListener('click', () => {
        if (this.quantity < 10) {
          this.quantity++;
          inputQty.value = this.quantity;
          this.updatePricing();
          if (window.motionSystem) window.motionSystem.playHaptic('click');
        }
      });
      inputQty.addEventListener('change', () => {
        const val = parseInt(inputQty.value, 10);
        this.quantity = Math.max(1, Math.min(10, isNaN(val) ? 1 : val));
        inputQty.value = this.quantity;
        this.updatePricing();
      });
    }

    // 5. Add to Cart / Buy Now buttons
    const btnAddToCart = document.getElementById('btn-add-to-cart');
    const btnBuyNow = document.getElementById('btn-buy-now');

    if (btnAddToCart) {
      btnAddToCart.addEventListener('click', () => {
        this.addToCart();
      });
    }

    if (btnBuyNow) {
      btnBuyNow.addEventListener('click', () => {
        this.addToCart();
        if (window.cartManager) window.cartManager.openCheckoutModal();
      });
    }
  }

  setVariant(variantKey) {
    this.selectedVariant = variantKey;
    document.querySelectorAll('.variant-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-variant') === variantKey);
    });

    if (window.motionSystem) window.motionSystem.playHaptic('click');
    if (window.trackEvent) {
      window.trackEvent('product_variant_change', { variant: variantKey });
    }
    this.updatePricing();
  }

  setColor(colorKey) {
    this.selectedColor = colorKey;
    document.querySelectorAll('.config-color-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-color') === colorKey);
    });

    // Update 3D shell if available
    if (window.ipet3D && typeof window.ipet3D.setShellColor === 'function') {
      window.ipet3D.setShellColor(colorKey);
    }

    // Update color label
    const label = document.getElementById('selected-color-label');
    const colorNames = {
      obsidian: 'Đen Obsidian (Matte Jet Black)',
      silver: 'Bạc Titan (Cyber Silver)',
      electric_blue: 'Xanh Điện Tử (Electric Cyan)'
    };
    if (label) label.textContent = colorNames[colorKey] || colorKey;

    if (window.motionSystem) window.motionSystem.playHaptic('click');
  }

  updatePricing() {
    const variantPrices = {
      standard: 1490000,
      maker_kit: 1290000,
      cyber_pro: 1890000
    };
    const addonPrices = {
      dock: 250000,
      shell_pack: 99000,
      extended_warranty: 150000
    };

    const unitPrice = variantPrices[this.selectedVariant] || 1490000;
    let addonsTotal = 0;
    this.selectedAddons.forEach(id => {
      addonsTotal += (addonPrices[id] || 0);
    });

    const itemTotal = (unitPrice + addonsTotal) * this.quantity;

    // Display formatted price
    const priceDisplay = document.getElementById('configurator-total-price');
    const stickyPriceDisplay = document.getElementById('sticky-bar-price');

    const formatted = `${itemTotal.toLocaleString('vi-VN')} ₫`;
    if (priceDisplay) priceDisplay.textContent = formatted;
    if (stickyPriceDisplay) stickyPriceDisplay.textContent = formatted;

    // Update sticky title
    const stickyTitle = document.getElementById('sticky-bar-variant');
    const variantNames = {
      standard: 'iPet Standard',
      maker_kit: 'iPet Maker / Dev Kit',
      cyber_pro: 'iPet Cyber Pro'
    };
    if (stickyTitle) stickyTitle.textContent = `${variantNames[this.selectedVariant]} (x${this.quantity})`;
  }

  addToCart() {
    if (!window.cartManager) return;

    window.cartManager.addItem({
      variant: this.selectedVariant,
      color: this.selectedColor,
      quantity: this.quantity,
      addons: Array.from(this.selectedAddons)
    });

    if (window.motionSystem) window.motionSystem.playHaptic('happy');
  }

  initStickyBar() {
    const stickyBar = document.getElementById('sticky-buy-bar');
    const hero = document.getElementById('hero');

    if (!stickyBar || !hero) return;

    window.addEventListener('scroll', () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      // Show sticky bar once hero has scrolled past
      if (heroBottom < 0) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });

    // Sticky Buy Bar CTA
    const stickyBtn = document.getElementById('btn-sticky-buy');
    if (stickyBtn) {
      stickyBtn.addEventListener('click', () => {
        this.addToCart();
        window.cartManager.openCart();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.productConfigurator = new ProductConfigurator();
});
