/**
 * iPet Production-Grade Checkout & Payment Flow
 * Seamless modal checkout with VietQR dynamic QR code & COD.
 */

class CheckoutFlow {
  constructor() {
    this.modal = document.getElementById('checkout-modal');
    this.successModal = document.getElementById('order-success-modal');
    this.lookupModal = document.getElementById('order-lookup-modal');
    this.form = document.getElementById('checkout-form');
    this.activeItem = null;
    this.activeCoupon = null;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Close checkout modal
    const btnClose = document.getElementById('btn-close-checkout');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Close success modal
    const btnCloseSuccess = document.getElementById('btn-close-success');
    if (btnCloseSuccess) {
      btnCloseSuccess.addEventListener('click', () => {
        this.successModal.style.display = 'none';
        if (window.motionSystem) window.motionSystem.unlockScroll();
      });
    }

    // Order lookup trigger in header/footer
    document.querySelectorAll('.btn-open-lookup').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openLookupModal();
      });
    });

    // Close lookup modal
    const btnCloseLookup = document.getElementById('btn-close-lookup');
    if (btnCloseLookup) {
      btnCloseLookup.addEventListener('click', () => {
        this.lookupModal.style.display = 'none';
        if (window.motionSystem) window.motionSystem.unlockScroll();
      });
    }

    // Lookup form submit
    const lookupForm = document.getElementById('order-lookup-form');
    if (lookupForm) {
      lookupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('lookup-code-input');
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        await this.handleOrderLookup(code);
      });
    }

    // Payment method radio change
    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isVietQR = e.target.value === 'vietqr';
        const qrHint = document.getElementById('vietqr-hint-box');
        if (qrHint) qrHint.style.display = isVietQR ? 'block' : 'none';
        if (window.trackEvent) window.trackEvent('payment_method_select', { method: e.target.value });
      });
    });

    // Checkout form submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  open(cartItem, coupon = null) {
    if (!this.modal) return;
    this.activeItem = cartItem;
    this.activeCoupon = coupon;

    // Reset errors
    document.querySelectorAll('.form-field-error').forEach(el => el.textContent = '');

    // Render order summary in checkout sidebar
    this.renderSummary();

    this.modal.style.display = 'flex';
    if (window.motionSystem) window.motionSystem.lockScroll();
    if (window.trackEvent) window.trackEvent('checkout_start');
  }

  close() {
    if (!this.modal) return;
    this.modal.style.display = 'none';
    if (window.motionSystem) window.motionSystem.unlockScroll();
  }

  renderSummary() {
    if (!this.activeItem) return;
    const summaryContainer = document.getElementById('checkout-order-summary');
    if (!summaryContainer) return;

    const variantNames = {
      standard: 'iPet Standard',
      maker_kit: 'iPet Maker / Dev Kit',
      cyber_pro: 'iPet Cyber Pro'
    };
    const variantPrices = { standard: 1490000, maker_kit: 1290000, cyber_pro: 1890000 };
    const addonPrices = { dock: 250000, shell_pack: 99000, extended_warranty: 150000 };
    const addonNames = { dock: 'Đế sạc từ tính', shell_pack: 'Ốp vỏ thay thế', extended_warranty: 'Bảo hành vàng' };

    const uPrice = variantPrices[this.activeItem.variant] || 1490000;
    let addonsSum = 0;
    (this.activeItem.addons || []).forEach(a => addonsSum += (addonPrices[a] || 0));

    const subtotal = (uPrice + addonsSum) * this.activeItem.quantity;
    const shipping = subtotal >= 1000000 ? 0 : 30000;

    let discount = 0;
    if (this.activeCoupon) {
      if (this.activeCoupon.type === 'percent') {
        discount = Math.round((subtotal * this.activeCoupon.value) / 100);
      } else {
        discount = Math.min(subtotal, this.activeCoupon.value);
      }
    }

    const total = Math.max(0, subtotal + shipping - discount);

    summaryContainer.innerHTML = `
      <div class="summary-line">
        <span>${variantNames[this.activeItem.variant] || this.activeItem.variant} (x${this.activeItem.quantity})</span>
        <strong>${(uPrice * this.activeItem.quantity).toLocaleString('vi-VN')} ₫</strong>
      </div>
      ${(this.activeItem.addons && this.activeItem.addons.length > 0) ? `
        <div class="summary-addons-list">
          ${this.activeItem.addons.map(a => `
            <div class="summary-line text-sm text-secondary">
              <span>+ ${addonNames[a] || a}</span>
              <span>+ ${(addonPrices[a] * this.activeItem.quantity).toLocaleString('vi-VN')} ₫</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="summary-line border-top">
        <span>Tạm tính</span>
        <span>${subtotal.toLocaleString('vi-VN')} ₫</span>
      </div>
      <div class="summary-line">
        <span>Phí vận chuyển</span>
        <span class="${shipping === 0 ? 'text-green' : ''}">${shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')} ₫`}</span>
      </div>
      ${discount > 0 ? `
        <div class="summary-line text-green">
          <span>Khuyến mãi (${this.activeCoupon.code})</span>
          <span>-${discount.toLocaleString('vi-VN')} ₫</span>
        </div>
      ` : ''}
      <div class="summary-line total-line">
        <span>Tổng thanh toán</span>
        <strong class="total-highlight">${total.toLocaleString('vi-VN')} ₫</strong>
      </div>
    `;
  }

  async handleSubmit() {
    const btnSubmit = document.getElementById('btn-submit-order');
    const submitText = document.getElementById('submit-order-text');
    const submitSpinner = document.getElementById('submit-order-spinner');

    // Clear previous field errors
    document.querySelectorAll('.form-field-error').forEach(el => el.textContent = '');

    const fullName = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const email = document.getElementById('checkout-email').value.trim();
    const province = document.getElementById('checkout-province').value.trim();
    const district = document.getElementById('checkout-district').value.trim();
    const ward = document.getElementById('checkout-ward').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const note = document.getElementById('checkout-note').value.trim();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

    const payload = {
      fullName,
      phone,
      email,
      province,
      district,
      ward,
      address,
      note,
      variant: this.activeItem.variant,
      color: this.activeItem.color,
      quantity: this.activeItem.quantity,
      addons: this.activeItem.addons || [],
      couponCode: this.activeCoupon ? this.activeCoupon.code : '',
      paymentMethod
    };

    // Client-side quick check
    if (!fullName || fullName.length < 2) {
      document.getElementById('err-name').textContent = 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự)';
      return;
    }
    if (!phone) {
      document.getElementById('err-phone').textContent = 'Vui lòng nhập số điện thoại';
      return;
    }
    if (!province) {
      document.getElementById('err-province').textContent = 'Vui lòng nhập Tỉnh / Thành phố';
      return;
    }
    if (!address) {
      document.getElementById('err-address').textContent = 'Vui lòng nhập địa chỉ cụ thể';
      return;
    }

    // Set loading state
    btnSubmit.disabled = true;
    submitText.style.display = 'none';
    submitSpinner.style.display = 'inline-block';

    try {
      const res = await window.iPetApi.createOrder(payload);

      if (!res.success) {
        if (res.validationErrors) {
          for (const [field, msg] of Object.entries(res.validationErrors)) {
            const errEl = document.getElementById(`err-${field}`);
            if (errEl) errEl.textContent = msg;
          }
        } else {
          alert(res.error || 'Lỗi khi tạo đơn hàng');
        }
        return;
      }

      // Order created successfully!
      const orderData = res.data;
      this.close();

      // Clear cart
      if (window.cartManager) {
        window.cartManager.items = [];
        window.cartManager.saveCart();
      }

      this.showSuccessModal(orderData);

      if (window.trackEvent) {
        window.trackEvent('order_created', { orderId: orderData.orderId, total: orderData.pricing.total });
        window.trackEvent('purchase', { orderId: orderData.orderId, value: orderData.pricing.total });
      }

    } catch (err) {
      alert('Không thể kết nối đến máy chủ thanh toán. Vui lòng thử lại.');
    } finally {
      btnSubmit.disabled = false;
      submitText.style.display = 'inline-block';
      submitSpinner.style.display = 'none';
    }
  }

  showSuccessModal(order) {
    if (!this.successModal) return;

    const contentEl = document.getElementById('success-modal-content');
    const isVietQR = order.paymentMethod === 'vietqr';

    contentEl.innerHTML = `
      <div class="order-receipt-card">
        <div class="receipt-header">
          <div class="success-icon-box">✓</div>
          <h2>Đặt Hàng Thành Công!</h2>
          <p class="order-id-badge">Mã đơn hàng: <strong>${order.orderId}</strong></p>
          <p class="text-secondary text-sm">Cảm ơn bạn đã nhận nuôi iPet. Thông tin đơn hàng đã được ghi nhận vào hệ thống.</p>
        </div>

        ${isVietQR && order.vietqr ? `
          <div class="vietqr-payment-box">
            <div class="qr-heading">
              <span class="qr-tag">VIETQR NAPAS 247</span>
              <h4>Quét mã QR để chuyển khoản nhanh</h4>
              <p class="text-sm text-secondary">Mở ứng dụng ngân hàng bất kỳ để quét mã tự động điền tiền và nội dung chuyển khoản.</p>
            </div>
            <div class="qr-image-wrapper">
              <img src="${order.vietqr.qrImageUrl}" alt="VietQR Thanh toán iPet" class="vietqr-img">
            </div>
            <div class="banking-details">
              <div class="bank-row">
                <span>Ngân hàng:</span>
                <strong>${order.vietqr.bankName}</strong>
              </div>
              <div class="bank-row">
                <span>Số tài khoản:</span>
                <div class="copy-cell">
                  <strong id="copy-stk">${order.vietqr.accountNo}</strong>
                  <button class="btn-copy" onclick="navigator.clipboard.writeText('${order.vietqr.accountNo}'); alert('Đã sao chép STK!');">Copy</button>
                </div>
              </div>
              <div class="bank-row">
                <span>Chủ tài khoản:</span>
                <strong>${order.vietqr.accountName}</strong>
              </div>
              <div class="bank-row">
                <span>Số tiền:</span>
                <strong class="text-cyan">${order.vietqr.amount.toLocaleString('vi-VN')} ₫</strong>
              </div>
              <div class="bank-row">
                <span>Nội dung chuyển:</span>
                <div class="copy-cell">
                  <strong id="copy-content">${order.vietqr.transferContent}</strong>
                  <button class="btn-copy" onclick="navigator.clipboard.writeText('${order.vietqr.transferContent}'); alert('Đã sao chép nội dung!');">Copy</button>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <div class="cod-confirmation-box">
            <h4>Phương thức: Thanh toán khi nhận hàng (COD)</h4>
            <p>Nhân viên iPet sẽ liên hệ với bạn qua số điện thoại <strong>${order.customer.phone}</strong> để xác nhận và gửi hàng trong thời gian sớm nhất.</p>
          </div>
        `}

        <div class="receipt-meta">
          <p><strong>Người nhận:</strong> ${order.customer.fullName}</p>
          <p><strong>Địa chỉ:</strong> ${order.customer.address}</p>
          <p><strong>Sản phẩm:</strong> ${order.pricing.variant.name} (${order.pricing.color}) x${order.pricing.quantity}</p>
          <p><strong>Tổng thanh toán:</strong> <strong class="text-cyan">${order.pricing.total.toLocaleString('vi-VN')} ₫</strong></p>
        </div>

        <div class="receipt-actions">
          <button class="btn btn-primary btn-full" onclick="window.print()">
            <i data-lucide="printer"></i> In Hóa Đơn
          </button>
          <button class="btn btn-secondary btn-full" onclick="document.getElementById('order-success-modal').style.display='none'">
            Tiếp Tục Khám Phá
          </button>
        </div>
      </div>
    `;

    this.successModal.style.display = 'flex';
    if (window.motionSystem) {
      window.motionSystem.lockScroll();
      window.motionSystem.playHaptic('happy');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  openLookupModal() {
    if (!this.lookupModal) return;
    this.lookupModal.style.display = 'flex';
    if (window.motionSystem) window.motionSystem.lockScroll();
  }

  async handleOrderLookup(code) {
    const resultBox = document.getElementById('lookup-result-box');
    if (!resultBox) return;

    resultBox.innerHTML = '<div class="loading-spinner"></div> Tra cứu đơn hàng...';
    resultBox.style.display = 'block';

    const res = await window.iPetApi.getOrder(code);
    if (!res.success) {
      resultBox.innerHTML = `<div class="alert-error">${res.error}</div>`;
      return;
    }

    const order = res.data;
    const statusMap = {
      PENDING: 'Đang chờ xử lý',
      PAYMENT_PENDING: 'Chờ thanh toán VietQR',
      PAID: 'Đã thanh toán',
      PROCESSING: 'Đang lắp ráp & đóng gói',
      SHIPPING: 'Đang vận chuyển',
      DELIVERED: 'Đã giao hàng thành công',
      CANCELLED: 'Đã hủy đơn',
      REFUNDED: 'Đã hoàn tiền'
    };

    resultBox.innerHTML = `
      <div class="order-lookup-card">
        <div class="lookup-status-row">
          <span>Mã đơn: <strong>${order.id}</strong></span>
          <span class="status-pill ${order.status}">${statusMap[order.status] || order.status}</span>
        </div>
        <div class="lookup-detail">
          <p><strong>Khách hàng:</strong> ${order.customerName} (${order.customerPhone})</p>
          <p><strong>Địa chỉ giao:</strong> ${order.shippingAddress}</p>
          <p><strong>Sản phẩm:</strong> ${order.variantName} - Màu: ${order.color} (SL: ${order.quantity})</p>
          <p><strong>Tổng tiền:</strong> ${order.totalAmount.toLocaleString('vi-VN')} ₫ (${order.paymentMethod.toUpperCase()})</p>
          ${order.trackingNumber ? `<p><strong>Mã vận đơn bưu cục:</strong> <span class="tracking-tag">${order.trackingNumber}</span></p>` : ''}
        </div>
        <div class="timeline-box">
          <h5>Tiến trình xử lý</h5>
          ${(order.timeline || []).map(t => `
            <div class="timeline-step">
              <span class="step-time">${new Date(t.timestamp).toLocaleDateString('vi-VN')} ${new Date(t.timestamp).toLocaleTimeString('vi-VN')}</span>
              <p>${t.reason}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.checkoutFlow = new CheckoutFlow();
});
