/**
 * iPet Hardware Architecture & CAD Gallery Interactive Module
 */

const GALLERY_DATA = {
  car_master: {
    title: 'Mô Hình Thiết Kế 3D Chuẩn Kỹ Thuật & Thẩm Mỹ',
    description: 'Thiết kế tổng thể theo tỷ lệ chuẩn 16.5cm x 10cm x 10cm, tích hợp quạt tản nhiệt, khoang pin Li-ion 18650 tích hợp, bộ điều khiển kép Type-C và bánh xe truyền động màu vàng.',
    image: '/assets/images/ipet-3d-car-master.jpg',
    specs: [
      { icon: 'maximize-2', title: 'Kích thước chuẩn', desc: 'Dài 16.5cm x Rộng 10cm x Cao 10cm (Bảo vệ trước 15cm)' },
      { icon: 'cpu', title: 'Cụm vi xử lý tối ưu', desc: 'ESP32-S3 và mạch breakout bố trí gọn gàng dưới nắp trong suốt' },
      { icon: 'battery-charging', title: 'Khoang pin tích hợp', desc: 'Khoang pin khép kín bảo vệ an toàn cell 18650' },
      { icon: 'wind', title: 'Quạt tản nhiệt chủ động', desc: 'Giữ vi xử lý luôn mát khi chạy tác vụ AI liên tục' }
    ]
  },
  schematic: {
    title: 'Sơ Đồ Nguyên Lý Mạch Điện Tử (Circuit Schematic)',
    description: 'Sơ đồ đấu nối hoàn chỉnh giữa ESP32-S3, màn hình màu ILI9341 SPI, cảm biến chạm TTP223, mạch khuếch đại âm thanh + loa/mic, driver động cơ TB6612FNG và 2 pin 18650.',
    image: '/assets/images/ipet-circuit-schematic.png',
    specs: [
      { icon: 'cpu', title: 'Vi điều khiển trung tâm', desc: 'ESP32-S3 Dual-Core 240MHz hỗ trợ NPU AI cục bộ' },
      { icon: 'tv', title: 'Màn hình cảm xúc', desc: 'ILI9341 2.8" SPI TFT LCD hiển thị 50+ biểu cảm' },
      { icon: 'zap', title: 'Động cơ & Driver', desc: 'Driver TB6612FNG điều khiển 2 động cơ TT tốc độ cao' },
      { icon: 'volume-2', title: 'Âm thanh đàm thoại', desc: 'Micro thu âm + IC khuếch đại và loa dynamic' }
    ]
  },
  topshell: {
    title: 'Bản Vẽ 3D CAD — Vỏ Trên Khí Động Học',
    description: 'Vỏ trên dáng xe thể thao bo tròn khí động học, có ô khoét vát nghiêng 36° cho màn hình LCD và 2 hốc vòm bánh xe bảo vệ khỏi bụi bẩn.',
    image: '/assets/images/ipet-cad-topshell.png',
    specs: [
      { icon: 'eye', title: 'Hốc màn hình vát nghiêng', desc: 'Góc 36 độ công thái học cho tầm mắt quan sát tốt nhất' },
      { icon: 'shield', title: 'Cản trước bo tròn', desc: 'Bảo vệ mặt trước khi di chuyển chạm mép bàn' },
      { icon: 'layers', title: 'Vòm che bánh xe', desc: 'Ngăn kẹt bụi vào trục bánh xe chuyển động' }
    ]
  },
  chassis: {
    title: 'Bản Vẽ 3D CAD — Khung Gầm Đáy Chịu Lực',
    description: 'Khung chassis đáy với các rãnh gá động cơ TT, ngàm giữ pin 18650, lỗ thoát dây tín hiệu và rãnh gá cản trước chịu lực va đập.',
    image: '/assets/images/ipet-cad-chassis.png',
    specs: [
      { icon: 'anchor', title: 'Ngàm giữ động cơ vững chắc', desc: 'Triệt tiêu rung chấn động cơ khi tăng tốc' },
      { icon: 'compass', title: 'Trọng tâm hạ thấp', desc: 'Đặt pin 18650 sát đáy giúp xe giữ thăng bằng tuyệt đối' },
      { icon: 'sliders', title: 'Lỗ thoát dây và vít định vị', desc: 'Chuẩn kích thước gia công in 3D và đúc khuôn nhựa' }
    ]
  }
};

class HardwareGallery {
  constructor() {
    this.activeTab = 'car_master';
    this.imgEl = document.getElementById('gallery-featured-img');
    this.titleEl = document.getElementById('gallery-title');
    this.descEl = document.getElementById('gallery-desc');
    this.specsListEl = document.getElementById('gallery-specs-list');

    this.init();
  }

  init() {
    document.querySelectorAll('.btn-gallery-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-gallery');
        this.switchTab(tab);
      });
    });

    this.render();
  }

  switchTab(tabKey) {
    if (!GALLERY_DATA[tabKey]) return;
    this.activeTab = tabKey;

    document.querySelectorAll('.btn-gallery-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-gallery') === tabKey);
    });

    this.render();
    if (window.motionSystem) window.motionSystem.playHaptic('click');
  }

  render() {
    const data = GALLERY_DATA[this.activeTab];
    if (!data) return;

    if (this.imgEl) {
      this.imgEl.style.opacity = '0';
      setTimeout(() => {
        this.imgEl.src = data.image;
        this.imgEl.alt = data.title;
        this.imgEl.style.opacity = '1';
      }, 150);
    }

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.descEl) this.descEl.textContent = data.description;

    if (this.specsListEl) {
      this.specsListEl.innerHTML = data.specs.map(s => `
        <div class="cad-spec-item">
          <i data-lucide="${s.icon}"></i>
          <div>
            <strong>${s.title}</strong>
            <span>${s.desc}</span>
          </div>
        </div>
      `).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.hardwareGallery = new HardwareGallery();
});
