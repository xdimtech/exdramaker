import type { AnalyticsProvider } from "../types";

/**
 * Simple Analytics Provider
 *
 * Wraps the existing Simple Analytics (sa_event) integration.
 * Privacy-friendly analytics with minimal tracking.
 */
export class SimpleAnalyticsProvider implements AnalyticsProvider {
  name = "Simple Analytics";

  isEnabled(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.sa_event === "function" &&
      import.meta.env.VITE_APP_ENABLE_TRACKING === "true"
    );
  }

  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
  ): void {
    if (!this.isEnabled()) {
      return;
    }

    try {
      window.sa_event(action, {
        category,
        label,
        value,
      });
    } catch (error) {
      console.error("[Analytics] Simple Analytics error:", error);
    }
  }
}
