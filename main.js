/**
 * iPet Main Application Entry Point
 * Orchestrates animations, particle canvas, mobile navigation and review modal.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- MOBILE NAV DRAWER ---
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  
  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileNavDrawer.style.height === '360px';
      mobileNavDrawer.style.height = isOpen ? '0' : '360px';
      mobileNavDrawer.setAttribute('aria-hidden', String(isOpen));
      
      const icon = mobileMenuBtn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isOpen ? 'menu' : 'x');
        lucide.createIcons();
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNavDrawer.style.height = '0';
        mobileNavDrawer.setAttribute('aria-hidden', 'true');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', 'menu');
          lucide.createIcons();
        }
      });
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
        this.color = isPurple ? 'rgba(189, 0, 255, 0.35)' : 'rgba(0, 240, 255, 0.35)';
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
      const count = Math.min(window.innerWidth / 20, 60);
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
  const robot3dCard = document.getElementById('robot-3d-card');
  const cardGlow = robot3dCard?.querySelector('.robot-card-glow');
  const cardOuter = robot3dCard?.querySelector('.robot-card');
  const robotHead = document.getElementById('robot-head-group');

  if (robot3dCard && cardOuter && !prefersReducedMotion) {
    robot3dCard.addEventListener('mousemove', (e) => {
      const rect = robot3dCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 10;
      const rotateX = -((y - centerY) / centerY) * 10;

      cardOuter.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      
      if (cardGlow) {
        const glowX = -((x - centerX) / centerX) * 15;
        const glowY = -((y - centerY) / centerY) * 15;
        cardGlow.style.transform = `translate(${glowX}px, ${glowY}px)`;
        cardGlow.style.opacity = '0.15';
      }

      if (robotHead) {
        const headX = ((x - centerX) / centerX) * 10;
        const headY = ((y - centerY) / centerY) * 8;
        robotHead.style.transform = `translate(${headX}px, ${headY}px)`;
      }
    });

    robot3dCard.addEventListener('mouseleave', () => {
      cardOuter.style.transition = 'transform 0.5s ease';
      cardOuter.style.transform = 'rotateX(0deg) rotateY(0deg)';
      
      if (cardGlow) {
        cardGlow.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        cardGlow.style.transform = 'translate(0, 0)';
        cardGlow.style.opacity = '0.1';
      }

      if (robotHead) {
        robotHead.style.transition = 'transform 0.5s ease';
        robotHead.style.transform = 'translate(0, 0)';
      }

      setTimeout(() => {
        cardOuter.style.transition = 'none';
        if (cardGlow) cardGlow.style.transition = 'none';
        if (robotHead) robotHead.style.transition = 'none';
      }, 500);
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

  // Auto eye blinking
  setInterval(() => {
    const robotContainer = document.querySelector('.robot-container');
    if (robotContainer) {
      robotContainer.classList.add('blinking');
      setTimeout(() => {
        robotContainer.classList.remove('blinking');
      }, 250);
    }
  }, 5000);
});
