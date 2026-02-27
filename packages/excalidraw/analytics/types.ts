/**
 * Analytics provider interface
 * All analytics providers must implement this interface
 */
export interface AnalyticsProvider {
  /** Provider name for debugging */
  name: string;

  /** Check if provider is enabled and ready */
  isEnabled(): boolean;

  /** Track an event */
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
  ): void;
}

/**
 * Event data structure passed to providers
 */
export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}
