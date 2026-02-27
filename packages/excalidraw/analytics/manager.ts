import type { AnalyticsProvider } from "./types";

/**
 * AnalyticsManager - Central dispatcher for all analytics providers
 *
 * Manages multiple analytics providers and dispatches events to all enabled providers.
 * Provider failures are isolated - if one fails, others continue to receive events.
 */
export class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Register an analytics provider
   */
  registerProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
    if (this.debug) {
      console.info(`[Analytics] Registered provider: ${provider.name}`);
    }
  }

  /**
   * Track an event across all enabled providers
   */
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
  ): void {
    this.providers.forEach((provider) => {
      if (provider.isEnabled()) {
        try {
          provider.trackEvent(category, action, label, value);

          if (this.debug) {
            console.info(`[Analytics] ${provider.name}:`, {
              category,
              action,
              label,
              value,
            });
          }
        } catch (error) {
          console.error(`[Analytics] ${provider.name} failed:`, error);
        }
      }
    });
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): string[] {
    return this.providers
      .filter((provider) => provider.isEnabled())
      .map((provider) => provider.name);
  }
}
