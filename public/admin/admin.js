/**
 * iPet Admin Dashboard Client Logic
 */

let adminToken = sessionStorage.getItem('ipet_admin_token') || '';
let currentTab = 'overview';
let cachedOrders = [];
let currentOrderFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  initAuth();
  bindEvents();
});

function initAuth() {
  const loginScreen = document.getElementById('login-screen');
  const dashboardApp = document.getElementById('dashboard-app');

  if (adminToken) {
    loginScreen.style.display = 'none';
    dashboardApp.style.display = 'flex';
    loadAllDashboardData();
  } else {
    loginScreen.style.display = 'flex';
    dashboardApp.style.display = 'none';
  }
}

function bindEvents() {
  // Login form
  const loginForm = document.getElementById('admin-login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const errorBox = document.getElementById('login-error');

    errorBox.style.display = 'none';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!data.success) {
        errorBox.textContent = data.error || 'Đăng nhập không thành công';
        errorBox.style.display = 'block';
        return;
      }

      adminToken = data.data.token;
      sessionStorage.setItem('ipet_admin_token', adminToken);
      sessionStorage.setItem('ipet_admin_name', data.data.username);

      document.getElementById('display-admin-name').textContent = data.data.username;
      initAuth();
    } catch (err) {
      errorBox.textContent = 'Lỗi kết nối máy chủ. Vui lòng thử lại.';
      errorBox.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('ipet_admin_token');
    sessionStorage.removeItem('ipet_admin_name');
    adminToken = '';
    initAuth();
  });

  // Tab switching
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Refresh button
  document.getElementById('btn-refresh-data').addEventListener('click', () => {
    loadAllDashboardData();
  });

  // Search filter
  document.getElementById('order-search-input').addEventListener('input', (e) => {
    filterOrders(e.target.value, currentOrderFilter);
  });

  // Status filters
  document.querySelectorAll('#order-status-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#order-status-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderFilter = btn.getAttribute('data-status');
      filterOrders(document.getElementById('order-search-input').value, currentOrderFilter);
    });
  });

  // Coupon create form
  document.getElementById('form-create-coupon').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('coupon-code').value;
    const type = document.getElementById('coupon-type').value;
    const value = document.getElementById('coupon-value').value;
    const minOrder = document.getElementById('coupon-min-order').value;
    const maxUses = document.getElementById('coupon-max-uses').value;

    try {
      const res = await adminFetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type, value, minOrder, maxUses })
      });
      const data = await res.json();
      if (data.success) {
        alert('Tạo mã giảm giá thành công!');
        document.getElementById('form-create-coupon').reset();
        loadCoupons();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Lỗi tạo mã giảm giá');
    }
  });

  // Modal close
  document.getElementById('btn-close-order-modal').addEventListener('click', () => {
    document.getElementById('order-modal').style.display = 'none';
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tabName}`);
  });

  const titles = {
    overview: 'Tổng quan doanh thu & Đơn hàng',
    orders: 'Quản lý danh sách đơn hàng D2C',
    inventory: 'Quản lý tồn kho linh kiện & Robot',
    reviews: 'Duyệt & Quản lý Đánh Giá',
    coupons: 'Quản lý Khuyến Mãi & Voucher'
  };
  document.getElementById('tab-title').textContent = titles[tabName] || 'Bảng Điều Khiển';

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function adminFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem('ipet_admin_token');
    adminToken = '';
    initAuth();
    throw new Error('Unauthorized');
  }
  return res;
}

async function loadAllDashboardData() {
  await Promise.all([
    loadStats(),
    loadOrders(),
    loadInventory(),
    loadReviews(),
    loadCoupons()
  ]);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadStats() {
  try {
    const res = await adminFetch('/api/admin/stats');
    const data = await res.json();
    if (!data.success) return;

    const { totalOrders, paidOrders, totalRevenue, inventory } = data.data;

    document.getElementById('stat-revenue').textContent = `${(totalRevenue || 0).toLocaleString('vi-VN')} ₫`;
    document.getElementById('stat-total-orders').textContent = totalOrders || 0;
    document.getElementById('stat-paid-orders').textContent = paidOrders || 0;

    let totalStock = 0;
    const stockListEl = document.getElementById('overview-stock-list');
    stockListEl.innerHTML = '';

    (inventory || []).forEach(item => {
      totalStock += item.stock_count;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '0.5rem 0';
      row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      row.innerHTML = `
        <span><strong>${item.variant_id.toUpperCase()}</strong></span>
        <span style="color: ${item.stock_count > 10 ? '#10b981' : '#f59e0b'}">${item.stock_count} sản phẩm</span>
      `;
      stockListEl.appendChild(row);
    });

    document.getElementById('stat-inventory-total').textContent = `${totalStock} robot`;
    document.getElementById('badge-orders-count').textContent = totalOrders || 0;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadOrders() {
  try {
    const res = await adminFetch('/api/admin/orders');
    const data = await res.json();
    if (!data.success) return;

    cachedOrders = data.data || [];
    renderRecentOrders(cachedOrders.slice(0, 5));
    filterOrders('', currentOrderFilter);
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function renderRecentOrders(orders) {
  const tbody = document.querySelector('#table-recent-orders tbody');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary);">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  orders.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.id}</strong></td>
      <td>${o.customer_name}</td>
      <td>${o.variant_name} (${o.color})</td>
      <td>${o.total_amount.toLocaleString('vi-VN')} ₫</td>
      <td>${o.payment_method.toUpperCase()}</td>
      <td><span class="status-pill ${o.status}">${o.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterOrders(searchTerm = '', statusFilter = 'ALL') {
  const tbody = document.querySelector('#table-orders-full tbody');
  tbody.innerHTML = '';

  const term = searchTerm.toLowerCase().trim();
  const filtered = cachedOrders.filter(o => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchTerm = !term || o.id.toLowerCase().includes(term) || o.customer_name.toLowerCase().includes(term) || o.customer_phone.includes(term);
    return matchStatus && matchTerm;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Không tìm thấy đơn hàng nào phù hợp</td></tr>';
    return;
  }

  filtered.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.id}</strong></td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(o.created_at).toLocaleString('vi-VN')}</td>
      <td>
        <div><strong>${o.customer_name}</strong></div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${o.customer_phone}</div>
      </td>
      <td style="max-width: 180px; font-size: 0.85rem;">${o.address}, ${o.ward}, ${o.district}, ${o.province}</td>
      <td>
        <div>${o.variant_name}</div>
        <div style="font-size: 0.8rem; color: var(--accent-cyan);">Màu: ${o.color} | SL: ${o.quantity}</div>
      </td>
      <td><strong>${o.total_amount.toLocaleString('vi-VN')} ₫</strong></td>
      <td><span class="status-pill ${o.status}">${o.status}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" onclick="openOrderDetailModal('${o.id}')">
          Chi tiết & Đổi trạng thái
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.openOrderDetailModal = (orderId) => {
  const order = cachedOrders.find(o => o.id === orderId);
  if (!order) return;

  const modalBody = document.getElementById('modal-order-body');
  document.getElementById('modal-order-title').textContent = `Đơn hàng #${order.id}`;

  const validTransitionsMap = {
    PENDING: ['PAYMENT_PENDING', 'PAID', 'PROCESSING', 'CANCELLED'],
    PAYMENT_PENDING: ['PAID', 'CANCELLED', 'FAILED'],
    PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
    PROCESSING: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['DELIVERED', 'REFUNDED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
    FAILED: []
  };

  const allowedNext = validTransitionsMap[order.status] || [];

  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Thông tin khách hàng</h4>
        <p><strong>${order.customer_name}</strong></p>
        <p>SĐT: ${order.customer_phone}</p>
        <p>Email: ${order.customer_email || 'Không có'}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.3rem;">
          Địa chỉ: ${order.address}, ${order.ward}, ${order.district}, ${order.province}
        </p>
      </div>
      <div>
        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Chi tiết thanh toán</h4>
        <p>Phương thức: <strong>${order.payment_method.toUpperCase()}</strong></p>
        <p>Tình trạng TT: <strong style="color: ${order.payment_status === 'PAID' ? '#10b981' : '#f59e0b'}">${order.payment_status}</strong></p>
        <p>Tổng tiền: <strong style="color: var(--accent-cyan); font-size: 1.1rem;">${order.total_amount.toLocaleString('vi-VN')} ₫</strong></p>
        <p>Mã vận đơn: <input type="text" id="modal-tracking-input" value="${order.tracking_number || ''}" placeholder="Nhập mã vận đơn ViettelPost/GHN" style="padding: 0.3rem 0.5rem; background: #000; border: 1px solid var(--border-color); color: #fff; border-radius: 4px; font-size: 0.85rem; width: 100%; margin-top: 0.3rem;"></p>
        <button class="btn btn-secondary" style="margin-top: 0.4rem; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="updateTrackingNumber('${order.id}')">Lưu mã vận đơn</button>
      </div>
    </div>

    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-bottom: 1.5rem;">
      <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Chuyển đổi trạng thái đơn hàng</h4>
      <p style="font-size: 0.85rem; margin-bottom: 0.75rem;">Trạng thái hiện tại: <span class="status-pill ${order.status}">${order.status}</span></p>
      
      ${allowedNext.length > 0 ? `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${allowedNext.map(st => `
            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="handleStatusTransition('${order.id}', '${st}')">
              Chuyển sang: ${st}
            </button>
          `).join('')}
        </div>
      ` : '<p style="color: var(--text-secondary); font-size: 0.85rem;">Đơn hàng đã ở trạng thái kết thúc, không thể đổi trạng thái.</p>'}
    </div>

    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Lịch sử thay đổi (Audit Log)</h4>
      <div style="max-height: 120px; overflow-y: auto; font-size: 0.8rem; color: var(--text-secondary);">
        ${(order.auditLog || []).map(log => `
          <div style="padding: 0.3rem 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span>[${new Date(log.timestamp).toLocaleTimeString('vi-VN')}]</span>
            <strong>${log.from} ➔ ${log.to}</strong>: ${log.reason}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('order-modal').style.display = 'flex';
};

window.handleStatusTransition = async (orderId, nextStatus) => {
  if (!confirm(`Xác nhận đổi trạng thái đơn hàng #${orderId} sang ${nextStatus}?`)) return;

  try {
    const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextStatus, reason: `Admin thao tác chuyển trạng thái sang ${nextStatus}` })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      document.getElementById('order-modal').style.display = 'none';
      loadOrders();
      loadStats();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Lỗi khi cập nhật trạng thái');
  }
};

window.updateTrackingNumber = async (orderId) => {
  const trackingNumber = document.getElementById('modal-tracking-input').value;
  try {
    const res = await adminFetch(`/api/admin/orders/${orderId}/tracking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber })
    });
    const data = await res.json();
    if (data.success) {
      alert('Đã cập nhật mã vận đơn!');
      loadOrders();
    }
  } catch (err) {
    alert('Lỗi cập nhật mã vận đơn');
  }
};

async function loadInventory() {
  try {
    const res = await adminFetch('/api/admin/inventory');
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.querySelector('#table-inventory-mgmt tbody');
    tbody.innerHTML = '';

    const priceMap = {
      standard: '1.490.000 ₫',
      maker_kit: '1.290.000 ₫',
      cyber_pro: '1.890.000 ₫'
    };

    data.data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.variant_id}</strong></td>
        <td>${item.variant_id.toUpperCase()}</td>
        <td>${priceMap[item.variant_id] || '---'}</td>
        <td><strong style="color: ${item.stock_count > 10 ? '#10b981' : '#f59e0b'}; font-size: 1.1rem;">${item.stock_count}</strong></td>
        <td>${item.stock_count > 0 ? '<span style="color: #10b981;">Còn hàng</span>' : '<span style="color: #ef4444;">Hết hàng</span>'}</td>
        <td>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="number" id="input-stock-${item.variant_id}" value="${item.stock_count}" min="0" style="width: 80px; padding: 0.3rem 0.5rem; background: #000; border: 1px solid var(--border-color); color: #fff; border-radius: 4px;">
            <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="saveStock('${item.variant_id}')">Cập nhật</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading inventory:', err);
  }
}

window.saveStock = async (variantId) => {
  const count = document.getElementById(`input-stock-${variantId}`).value;
  try {
    const res = await adminFetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, stockCount: count })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadInventory();
      loadStats();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Lỗi cập nhật kho');
  }
};

async function loadReviews() {
  try {
    const res = await adminFetch('/api/admin/reviews');
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.querySelector('#table-reviews-mgmt tbody');
    tbody.innerHTML = '';

    data.data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${r.author_name}</strong></td>
        <td>${r.variant}</td>
        <td style="color: #f59e0b;">★ ${r.rating}/5</td>
        <td style="max-width: 250px; font-size: 0.85rem;">${r.content}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
        <td>
          <span class="status-pill ${r.is_approved ? 'PAID' : 'CANCELLED'}">
            ${r.is_approved ? 'Đã duyệt công khai' : 'Tạm ẩn'}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="toggleReviewStatus(${r.id}, ${!r.is_approved})">
            ${r.is_approved ? 'Ẩn đánh giá' : 'Duyệt công khai'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

window.toggleReviewStatus = async (reviewId, isApproved) => {
  try {
    const res = await adminFetch(`/api/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved })
    });
    const data = await res.json();
    if (data.success) {
      loadReviews();
    }
  } catch (err) {
    alert('Lỗi duyệt đánh giá');
  }
};

async function loadCoupons() {
  try {
    const res = await adminFetch('/api/admin/coupons');
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.querySelector('#table-coupons-list tbody');
    tbody.innerHTML = '';

    data.data.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.code}</strong></td>
        <td>${c.type === 'percent' ? 'Phần trăm' : 'Số tiền'}</td>
        <td style="color: var(--accent-cyan);">${c.type === 'percent' ? `${c.value}%` : `${c.value.toLocaleString('vi-VN')} ₫`}</td>
        <td>${c.uses_count} / ${c.max_uses}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading coupons:', err);
  }
}
