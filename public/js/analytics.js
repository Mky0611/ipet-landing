/**
 * iPet Analytics Event Tracking Abstraction Layer
 * Decouples application logic from specific analytics vendors (GA4, Mixpanel, Meta Pixel, etc.)
 */

class AnalyticsService {
  constructor() {
    this.providers = [];
    this.isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  }

  /**
   * Register a third-party analytics provider
   * @param {Object} provider - Provider interface { track(eventName, params) }
   */
  registerProvider(provider) {
    if (provider && typeof provider.track === 'function') {
      this.providers.push(provider);
    }
  }

  /**
   * Track high-intent user interaction event
   * @param {string} eventName
   * @param {Object} [params]
   */
  track(eventName, params = {}) {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...params
    };

    if (!this.isProduction) {
      console.log(`%c[Analytics Event]: %c${eventName}`, 'color: #00f0ff; font-weight: bold;', 'color: #fff;', params);
    }

    // Dispatch to registered providers
    this.providers.forEach(p => {
      try {
        p.track(eventName, payload);
      } catch (err) {
        console.warn(`Analytics provider error on ${eventName}:`, err);
      }
    });

    // Also dispatch as custom DOM event for integrations
    window.dispatchEvent(new CustomEvent('ipet:analytics', { detail: payload }));
  }
}

const analytics = new AnalyticsService();

// Global helper
window.trackEvent = (eventName, params) => analytics.track(eventName, params);
