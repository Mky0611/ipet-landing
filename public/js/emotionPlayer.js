/**
 * iPet Real Emotion Frame Sequence Player
 * Plays high-speed animated PNG sequences extracted from project's hardware emotion assets.
 */

class EmotionPlayer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.manifest = null;
    this.currentEmotion = 'Normal';
    this.currentFrameIndex = 0;
    this.fps = 24;
    this.interval = 1000 / this.fps;
    this.lastFrameTime = 0;
    this.isPlaying = true;
    this.cachedImages = {}; // url -> Image object
    this.animationId = null;

    this.init();
  }

  async init() {
    try {
      const res = await fetch('/Emotions/manifest.json');
      this.manifest = await res.json();
    } catch (e) {
      console.warn('Could not load emotion manifest, using fallback:', e);
      return;
    }

    this.bindControls();
    this.setEmotion('Normal');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setEmotion(emotionName) {
    if (!this.manifest || !this.manifest[emotionName]) {
      console.warn(`Emotion ${emotionName} not found in manifest`);
      return;
    }

    this.currentEmotion = emotionName;
    this.currentFrameIndex = 0;

    // Update active button state
    document.querySelectorAll('.btn-emotion-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-emotion') === emotionName);
    });

    const label = document.getElementById('emotion-display-title');
    if (label) {
      const labels = {
        Normal: 'Bình Thường (Normal Eye Blink)',
        Happy: 'Hạnh Phúc (Happy Smile)',
        Laugh: 'Cười Vui Vẻ (Laughing)',
        Game: 'Chế Độ Chơi Game (Retro Pixel)',
        Speed: 'Tăng Tốc Đua Xe (Speed Focus)',
        Tired: 'Buồn Ngủ / Yếu Pin (Tired / Sleep)',
        Hypnoise: 'Thôi Miên Khi Cù Má (Hypnotized)'
      };
      label.textContent = labels[emotionName] || emotionName;
    }

    if (window.motionSystem) {
      if (['Happy', 'Laugh'].includes(emotionName)) window.motionSystem.playHaptic('happy');
      else if (emotionName === 'Tired') window.motionSystem.playHaptic('purr');
      else window.motionSystem.playHaptic('beep');
    }
  }

  preloadImage(url) {
    if (!this.cachedImages[url]) {
      const img = new Image();
      img.src = url;
      this.cachedImages[url] = img;
    }
    return this.cachedImages[url];
  }

  loop(timestamp) {
    this.animationId = requestAnimationFrame(this.loop);

    if (!this.manifest || !this.manifest[this.currentEmotion]) return;

    const frames = this.manifest[this.currentEmotion];
    if (frames.length === 0) return;

    if (timestamp - this.lastFrameTime >= this.interval) {
      this.lastFrameTime = timestamp;

      const frameUrl = frames[this.currentFrameIndex];
      const img = this.preloadImage(frameUrl);

      // Preload next 3 frames
      for (let i = 1; i <= 3; i++) {
        const nextIdx = (this.currentFrameIndex + i) % frames.length;
        this.preloadImage(frames[nextIdx]);
      }

      if (img.complete && img.naturalWidth !== 0) {
        // Clear canvas
        this.ctx.fillStyle = '#06080d';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image centered with aspect fit
        const hRatio = this.canvas.width / img.width;
        const vRatio = this.canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (this.canvas.width - img.width * ratio) / 2;
        const centerShiftY = (this.canvas.height - img.height * ratio) / 2;

        this.ctx.drawImage(
          img,
          0, 0, img.width, img.height,
          centerShiftX, centerShiftY, img.width * ratio, img.height * ratio
        );
      }

      this.currentFrameIndex = (this.currentFrameIndex + 1) % frames.length;
    }
  }

  bindControls() {
    document.querySelectorAll('.btn-emotion-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const emo = btn.getAttribute('data-emotion');
        this.setEmotion(emo);
      });
    });

    // Touch nodes trigger emotions
    document.querySelectorAll('.sensor-node').forEach(node => {
      node.addEventListener('click', () => {
        const sensor = node.getAttribute('data-sensor');
        const feedback = document.getElementById('touch-feedback-box');

        if (sensor === 'head') {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Xoa đầu iPet! Mắt chuyển sang Happy rạng rỡ.';
          this.setEmotion('Happy');
          setTimeout(() => this.setEmotion('Normal'), 4000);
        } else if (sensor.startsWith('cheek')) {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Cù má iPet! Mắt chuyển sang thôi miên Hypnotized.';
          this.setEmotion('Hypnoise');
          setTimeout(() => this.setEmotion('Normal'), 4000);
        } else if (sensor === 'chest') {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Phát hiện giọng nói! iPet chuyển sang Game mode.';
          this.setEmotion('Game');
          setTimeout(() => this.setEmotion('Normal'), 3500);
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.emotionPlayer = new EmotionPlayer('emotion-screen-canvas');
});
