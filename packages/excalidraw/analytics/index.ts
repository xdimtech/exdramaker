/**
 * Analytics Module
 *
 * Multi-provider analytics system supporting Simple Analytics and PostHog.
 * All exports maintain backward compatibility with existing trackEvent API.
 */

export { AnalyticsManager } from "./manager";
export { SimpleAnalyticsProvider } from "./providers/simple-analytics";
export { PostHogProvider } from "./providers/posthog";
export type { AnalyticsProvider, AnalyticsEvent } from "./types";
