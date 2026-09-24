/**
 * iPet Theme Switcher (Dark & Light Mode)
 */

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('ipet_theme') || 'dark';
    this.applyTheme(this.currentTheme);
    this.bindEvents();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ipet_theme', theme);

    const btn = document.getElementById('btn-toggle-theme');
    if (btn) {
      btn.innerHTML = theme === 'dark' 
        ? '<i data-lucide="sun"></i>' 
        : '<i data-lucide="moon"></i>';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  toggle() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    if (window.motionSystem) window.motionSystem.playHaptic('toggle');
  }

  bindEvents() {
    const btn = document.getElementById('btn-toggle-theme');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
