/**
 * iPet Main Application Entry Point
 * Orchestrates animations, particle canvas, mobile navigation, interactive voice prompts and review modal.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- MOBILE NAV DRAWER & ACCESSIBILITY ---
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  const closeMobileNav = () => {
    if (!mobileNavDrawer || !mobileMenuBtn) return;
    mobileNavDrawer.style.height = '0';
    mobileNavDrawer.setAttribute('aria-hidden', 'true');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    const icon = mobileMenuBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', 'menu');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  };

  const openMobileNav = () => {
    if (!mobileNavDrawer || !mobileMenuBtn) return;
    mobileNavDrawer.style.height = '360px';
    mobileNavDrawer.setAttribute('aria-hidden', 'false');
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
    const icon = mobileMenuBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', 'x');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  };

  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Escape key listener for accessible closing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileNav();
        // Also close any open modals
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) checkoutModal.style.display = 'none';
        const lookupModal = document.getElementById('order-lookup-modal');
        if (lookupModal) lookupModal.style.display = 'none';
        const reviewModal = document.getElementById('review-modal');
        if (reviewModal) reviewModal.style.display = 'none';
        if (window.cartManager) window.cartManager.closeCart();
      }
    });
  }

  // --- FLOATING PARTICLES BACKGROUND (CANVAS) ---
  const canvas = document.getElementById('particles-canvas');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 100 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.3 - 0.15;
        this.speedY = Math.random() * 0.3 - 0.15;
        const isPurple = Math.random() > 0.6;
        this.color = isPurple ? 'rgba(139, 92, 246, 0.25)' : 'rgba(59, 130, 246, 0.25)';
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        if (mouse.x != null && mouse.y != null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= (dx / distance) * force * 1.5;
            this.y -= (dy / distance) * force * 1.5;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const count = Math.min(window.innerWidth / 25, 45);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };
    initParticles();

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }

  // --- 2D PERSPECTIVE COMPANION CARD TILT ---
  const carHeroCard = document.getElementById('car-hero-card') || document.querySelector('.car-hero-card');
  if (carHeroCard && !prefersReducedMotion) {
    carHeroCard.addEventListener('mousemove', (e) => {
      const rect = carHeroCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 4;
      const rotateX = -((y - centerY) / centerY) * 4;
      carHeroCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    carHeroCard.addEventListener('mouseleave', () => {
      carHeroCard.style.transition = 'transform 0.5s ease';
      carHeroCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      setTimeout(() => {
        carHeroCard.style.transition = '';
      }, 500);
    });
  }

  // --- INTERACTIVE VOICE PROMPTS & SOUNDWAVE RESPONSES ---
  const promptButtons = document.querySelectorAll('.btn-prompt');
  const chatMessages = document.getElementById('chat-messages');
  const soundwaveBars = document.querySelectorAll('.soundwave-bar');

  const voiceResponses = {
    love: {
      userText: 'iPet có yêu mình không?',
      botText: 'Bíp! Yêu bạn nhiều lắm luôn! Mỗi lần bạn làm việc, có mình ở cạnh làm bạn nhé! ❤️',
      emotion: 'Happy'
    },
    joke: {
      userText: 'Kể chuyện cười đi!',
      botText: 'Hôm nay có chú bug trốn trong code của bạn, nhưng em đã dùng bánh Mecanum drift bay nó đi rồi! Haha 😆',
      emotion: 'Laugh'
    },
    dance: {
      userText: 'Bật nhạc nhảy nhót nào!',
      botText: 'Đã sẵn sàng! 4 bánh Mecanum đang kích hoạt chế độ drift 360 độ theo điệu nhạc! 🎵',
      emotion: 'Game'
    },
    sleep: {
      userText: 'Đi ngủ thôi iPet.',
      botText: 'Oáp... Em cũng buồn ngủ rồi. Chúc bạn ngủ ngon, mai lại cùng vui chơi nhé! 💤',
      emotion: 'Tired'
    }
  };

  if (promptButtons.length > 0 && chatMessages) {
    promptButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const promptKey = btn.getAttribute('data-prompt');
        const data = voiceResponses[promptKey];
        if (!data) return;

        // Animate soundwaves
        soundwaveBars.forEach(bar => {
          bar.style.animationDuration = '0.4s';
        });

        // Add user and bot bubbles
        chatMessages.innerHTML = `
          <div class="chat-bubble" style="align-items: flex-end; margin-bottom: 0.65rem;">
            <div class="bubble-sender" style="color: var(--text-muted); font-size: 0.75rem;">Bạn</div>
            <div class="bubble-content" style="background: var(--primary-light); border-color: var(--border-glow-blue); font-size: 0.88rem;">
              "${data.userText}"
            </div>
          </div>
          <div class="chat-bubble bot">
            <div class="bubble-sender"><i data-lucide="bot"></i> iPet</div>
            <div class="bubble-content">
              ${data.botText}
            </div>
          </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Switch emotion if emotionPlayer is active
        if (window.emotionPlayer && typeof window.emotionPlayer.setEmotion === 'function') {
          window.emotionPlayer.setEmotion(data.emotion);
        }

        setTimeout(() => {
          soundwaveBars.forEach(bar => {
            bar.style.animationDuration = '1.2s';
          });
        }, 1500);
      });
    });
  }

  // --- REVIEW SUBMISSION MODAL ---
  const btnOpenReviewModal = document.getElementById('btn-open-review-modal');
  const reviewModal = document.getElementById('review-modal');
  const reviewForm = document.getElementById('review-form');

  if (btnOpenReviewModal && reviewModal) {
    btnOpenReviewModal.addEventListener('click', () => {
      reviewModal.style.display = 'flex';
      if (window.motionSystem) window.motionSystem.lockScroll();
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const authorName = document.getElementById('review-name').value;
      const variant = document.getElementById('review-variant').value;
      const rating = document.getElementById('review-rating').value;
      const content = document.getElementById('review-content').value;

      try {
        const res = await window.iPetApi.submitReview({ authorName, variant, rating, content });
        if (res.success) {
          alert('Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn đã được ghi nhận.');
          reviewModal.style.display = 'none';
          reviewForm.reset();
          if (window.motionSystem) window.motionSystem.unlockScroll();
        } else {
          alert(res.error || 'Lỗi gửi đánh giá');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ');
      }
    });
  }
});
