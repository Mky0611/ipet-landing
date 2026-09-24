/**
 * iPet Mecanum Omni-Directional Wheel Movement Simulator
 * Simulates real hardware TB6612FNG + 2x TT Mecanum motors behavior.
 */

class MecanumSimulator {
  constructor(arenaId) {
    this.arena = document.getElementById(arenaId);
    if (!this.arena) return;

    this.car = document.getElementById('mecanum-car');
    this.posX = 0; // Relative to arena center
    this.posY = 0;
    this.angle = 0;
    this.speed = 0;
    this.currentMode = 'STANDBY';

    this.initControls();
  }

  updateCarVisual() {
    if (!this.car) return;
    // Clamp movement inside arena bounds
    const maxBoundX = 140;
    const maxBoundY = 90;
    this.posX = Math.max(-maxBoundX, Math.min(maxBoundX, this.posX));
    this.posY = Math.max(-maxBoundY, Math.min(maxBoundY, this.posY));

    this.car.style.transform = `translate(${this.posX}px, ${this.posY}px) rotate(${this.angle}deg)`;

    // Update telemetry display
    const modeEl = document.getElementById('telemetry-mode');
    const speedEl = document.getElementById('telemetry-speed');
    const angleEl = document.getElementById('telemetry-angle');

    if (modeEl) modeEl.textContent = this.currentMode;
    if (speedEl) speedEl.textContent = `${this.speed} RPM`;
    if (angleEl) angleEl.textContent = `${Math.round(this.angle % 360)}°`;
  }

  move(direction) {
    const step = 15;
    const rotStep = 18;
    this.speed = 120;

    switch (direction) {
      case 'forward':
        this.posY -= step;
        this.currentMode = 'TIẾN THẲNG';
        break;
      case 'backward':
        this.posY += step;
        this.currentMode = 'LÙI XE';
        break;
      case 'left':
        this.angle -= rotStep;
        this.currentMode = 'XOAY TRÁI 360°';
        break;
      case 'right':
        this.angle += rotStep;
        this.currentMode = 'XOAY PHẢI 360°';
        break;
      case 'strafe-left':
        this.posX -= step;
        this.currentMode = 'DRIFT NGANG TRÁI';
        break;
      case 'strafe-right':
        this.posX += step;
        this.currentMode = 'DRIFT NGANG PHẢI';
        break;
      case 'reset':
        this.posX = 0;
        this.posY = 0;
        this.angle = 0;
        this.speed = 0;
        this.currentMode = 'STANDBY';
        break;
    }

    if (window.motionSystem) window.motionSystem.playHaptic('click');
    this.updateCarVisual();

    // Reset speed to 0 after short pause
    setTimeout(() => {
      this.speed = 0;
      this.currentMode = 'STANDBY';
      this.updateCarVisual();
    }, 400);
  }

  initControls() {
    // D-Pad Buttons
    document.querySelectorAll('.btn-mecanum-drive').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-direction');
        this.move(dir);
      });
    });

    // Keyboard support (W, A, S, D, Q, E)
    window.addEventListener('keydown', (e) => {
      // Only when not focused on an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.move('forward');
      else if (key === 's' || key === 'arrowdown') this.move('backward');
      else if (key === 'a' || key === 'arrowleft') this.move('left');
      else if (key === 'd' || key === 'arrowright') this.move('right');
      else if (key === 'q') this.move('strafe-left');
      else if (key === 'e') this.move('strafe-right');
    });

    this.updateCarVisual();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.mecanumSim = new MecanumSimulator('mecanum-arena');
});
