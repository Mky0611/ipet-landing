/**
 * iPet Interactive Emotion Simulator & Touch Reactions
 */

class EmotionSimulator {
  constructor() {
    this.eyeLeft = document.getElementById('eye-left');
    this.eyeRight = document.getElementById('eye-right');
    this.pupilLeft = document.getElementById('pupil-left');
    this.pupilRight = document.getElementById('pupil-right');
    this.blushLeft = document.getElementById('blush-left');
    this.blushRight = document.getElementById('blush-right');
    this.currentEmotionLabel = document.getElementById('current-emotion-label');
    this.robotHead = document.getElementById('robot-head-group');
    this.earLeft = document.getElementById('robot-ear-left');
    this.earRight = document.getElementById('robot-ear-right');
    this.collarRing = document.getElementById('collar-ring');

    this.emotions = {
      curious: {
        pathLeft: 'M -16,-16 L 16,-16 C 22,-16 22,16 16,16 L -16,16 C -22,16 -22,-16 -16,-16 Z',
        pathRight: 'M -16,-16 L 16,-16 C 22,-16 22,16 16,16 L -16,16 C -22,16 -22,-16 -16,-16 Z',
        color: '#00f0ff',
        blush: 0,
        pupils: 0.6,
        collar: '#00f0ff'
      },
      happy: {
        pathLeft: 'M -16,6 C -16,6 0,-10 16,6 C 16,6 12,12 12,12 C 12,12 0,-4 -12,12 Z',
        pathRight: 'M -16,6 C -16,6 0,-10 16,6 C 16,6 12,12 12,12 C 12,12 0,-4 -12,12 Z',
        color: '#00f0ff',
        blush: 0.8,
        pupils: 0,
        collar: '#00f0ff'
      },
      love: {
        pathLeft: 'M 0,8 C -8,0 -12,-8 -6,-14 C -2,-18 0,-12 0,-12 C 0,-12 2,-18 6,-14 C 12,-8 8,0 0,8 Z',
        pathRight: 'M 0,8 C -8,0 -12,-8 -6,-14 C -2,-18 0,-12 0,-12 C 0,-12 2,-18 6,-14 C 12,-8 8,0 0,8 Z',
        color: '#ff007b',
        blush: 0.95,
        pupils: 0,
        collar: '#bd00ff'
      },
      thinking: {
        pathLeft: 'M -18,-3 L 18,-3 C 20,-3 20,3 18,3 L -18,3 C -20,3 -20,-3 -18,-3 Z',
        pathRight: 'M -18,-3 L 18,-3 C 20,-3 20,3 18,3 L -18,3 C -20,3 -20,-3 -18,-3 Z',
        color: '#bd00ff',
        blush: 0,
        pupils: 0,
        collar: '#bd00ff'
      },
      listening: {
        pathLeft: 'M -18,-2 L 18,-2 C 19,-2 19,2 18,2 L -18,2 C -19,2 -19,-2 -18,-2 Z',
        pathRight: 'M -18,-2 L 18,-2 C 19,-2 19,2 18,2 L -18,2 C -19,2 -19,-2 -18,-2 Z',
        color: '#00f0ff',
        blush: 0,
        pupils: 0,
        collar: '#00f0ff'
      },
      sleeping: {
        pathLeft: 'M -16,-6 C -16,-6 0,8 16,-6 C 16,-6 12,-11 12,-11 C 12,-11 0,2 -12,-11 Z',
        pathRight: 'M -16,-6 C -16,-6 0,8 16,-6 C 16,-6 12,-11 12,-11 C 12,-11 0,2 -12,-11 Z',
        color: '#1a4e6e',
        blush: 0,
        pupils: 0,
        collar: 'rgba(255,255,255,0.1)'
      }
    };

    this.activeEmotion = 'curious';
    this.init();
  }

  setEmotion(name) {
    const config = this.emotions[name];
    if (!config || !this.eyeLeft || !this.eyeRight) return;

    this.activeEmotion = name;

    this.eyeLeft.setAttribute('d', config.pathLeft);
    this.eyeRight.setAttribute('d', config.pathRight);
    this.eyeLeft.setAttribute('fill', config.color);
    this.eyeRight.setAttribute('fill', config.color);

    if (this.pupilLeft) this.pupilLeft.setAttribute('opacity', config.pupils);
    if (this.pupilRight) this.pupilRight.setAttribute('opacity', config.pupils);

    if (this.blushLeft) this.blushLeft.style.opacity = config.blush;
    if (this.blushRight) this.blushRight.style.opacity = config.blush;

    if (this.collarRing) this.collarRing.setAttribute('stroke', config.collar);

    if (this.currentEmotionLabel) {
      const labels = {
        curious: 'Tò mò (Curious)',
        happy: 'Hạnh phúc (Happy)',
        love: 'Yêu quý (Affectionate)',
        thinking: 'Đang suy nghĩ (Thinking)',
        listening: 'Lắng nghe (Listening)',
        sleeping: 'Ngủ sâu (Sleeping)'
      };
      this.currentEmotionLabel.textContent = labels[name] || name;
    }

    document.querySelectorAll('.btn-face-mood').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-emotion') === name);
    });

    if (window.motionSystem) {
      if (name === 'happy' || name === 'love') window.motionSystem.playHaptic('happy');
      else if (name === 'sleeping') window.motionSystem.playHaptic('purr');
      else window.motionSystem.playHaptic('beep');
    }
  }

  init() {
    // Quick face mood buttons
    document.querySelectorAll('.btn-face-mood').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-emotion');
        this.setEmotion(mood);
      });
    });

    // Blueprint sensor nodes
    document.querySelectorAll('.sensor-node').forEach(node => {
      node.addEventListener('click', () => {
        const sensor = node.getAttribute('data-sensor');
        const feedback = document.getElementById('touch-feedback-box');

        if (sensor === 'head') {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Xoa đầu iPet! Robot kêu tút bíp và mắt chuyển sang Happy.';
          this.setEmotion('happy');
          setTimeout(() => { if (this.activeEmotion === 'happy') this.setEmotion('curious'); }, 3500);
        } else if (sensor.startsWith('cheek')) {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Cù má iPet! Hai má ửng hồng neon và mắt trái tim.';
          this.setEmotion('love');
          setTimeout(() => { if (this.activeEmotion === 'love') this.setEmotion('curious'); }, 3500);
        } else if (sensor === 'chest') {
          if (feedback) feedback.querySelector('.log-text').textContent = 'Kích hoạt micro ngực! iPet lắng nghe mệnh lệnh âm thanh.';
          this.setEmotion('listening');
          setTimeout(() => { if (this.activeEmotion === 'listening') this.setEmotion('curious'); }, 3000);
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.emotionSimulator = new EmotionSimulator();
});
