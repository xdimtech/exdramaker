// place here categories that you want to track. We want to track just a

import { isDevEnv } from "@excalidraw/common";

import {
  AnalyticsManager,
  PostHogProvider,
  SimpleAnalyticsProvider,
} from "./analytics/index";

// small subset of categories at a given time.
const ALLOWED_CATEGORIES_TO_TRACK = new Set([
  "command_palette",
  "export",
  "element", // Create, delete, modify elements
  "clipboard", // Copy, paste, cut operations
  "selection", // Select, deselect operations
  "share", // Collaboration, room creation/joining
  "feature", // AI, text-to-diagram, libraries
  "app", // Load, version, errors, performance
]);

// Initialize analytics manager with providers
const analyticsManager = new AnalyticsManager(!import.meta.env.PROD);

// Register providers (both Simple Analytics and PostHog)
analyticsManager.registerProvider(new SimpleAnalyticsProvider());
analyticsManager.registerProvider(new PostHogProvider());

/**
 * Track an analytics event
 *
 * Events are dispatched to all enabled providers (Simple Analytics, PostHog).
 * Only tracks events in allowed categories and when tracking is enabled.
 *
 * @param category - Event category (e.g., "export", "command_palette")
 * @param action - Event action (e.g., "png", "open")
 * @param label - Optional event label
 * @param value - Optional numeric value
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
) => {
  try {
    if (
      typeof window === "undefined" ||
      import.meta.env.VITE_WORKER_ID ||
      import.meta.env.VITE_APP_ENABLE_TRACKING !== "true"
    ) {
      return;
    }

    if (!ALLOWED_CATEGORIES_TO_TRACK.has(category)) {
      return;
    }

    if (isDevEnv()) {
      // Allow tracking in dev when debug mode is enabled
      if (import.meta.env.VITE_APP_POSTHOG_DEBUG !== "true") {
        return;
      }
      console.info("[Analytics] Dev mode tracking enabled (debug mode)");
    }

    if (!import.meta.env.PROD) {
      console.info("trackEvent", { category, action, label, value });
    }

    // Dispatch to all enabled providers
    analyticsManager.trackEvent(category, action, label, value);
  } catch (error) {
    console.error("error during analytics", error);
  }
};
