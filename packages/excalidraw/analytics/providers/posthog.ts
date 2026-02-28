import posthog from "posthog-js";

import type { AnalyticsProvider } from "../types";

/**
 * PostHog Analytics Provider
 *
 * Integrates with PostHog Cloud for advanced product analytics.
 * Uses the official posthog-js library with privacy-first settings
 * (no session recording, no autocapture).
 */
export class PostHogProvider implements AnalyticsProvider {
  name = "PostHog";

  isEnabled(): boolean {
    return (
      typeof window !== "undefined" &&
      posthog.__loaded &&
      import.meta.env.VITE_APP_ENABLE_TRACKING === "true" &&
      import.meta.env.VITE_APP_POSTHOG_ENABLED === "true"
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
      // Format event name: category:action
      const eventName = `${category}:${action}`;

      // Build properties object (exclude undefined values)
      const properties: Record<string, string | number> = {
        category,
        action,
      };

      if (label !== undefined) {
        properties.label = label;
      }

      if (value !== undefined) {
        properties.value = value;
      }

      // Add contextual metadata
      properties.app_version = import.meta.env.PKG_VERSION || "unknown";
      properties.environment = import.meta.env.MODE || "production";

      // Track event in PostHog
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error("[Analytics] PostHog error:", error);
    }
  }
}
