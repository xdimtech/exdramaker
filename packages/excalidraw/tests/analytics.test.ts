import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  AnalyticsManager,
  PostHogProvider,
  SimpleAnalyticsProvider,
} from "../analytics/index";

describe("Analytics System", () => {
  // Save original environment
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset window object
    if (typeof window !== "undefined") {
      delete (window as any).sa_event;
      delete (window as any).posthog;
    }

    // Reset environment
    Object.keys(originalEnv).forEach((key) => {
      (import.meta.env as any)[key] = originalEnv[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AnalyticsManager", () => {
    it("should register providers", () => {
      const manager = new AnalyticsManager();
      const provider = new SimpleAnalyticsProvider();

      manager.registerProvider(provider);

      expect(manager.getEnabledProviders()).toEqual([]);
    });

    it("should track events to all enabled providers", () => {
      const manager = new AnalyticsManager();

      // Mock window.sa_event
      (window as any).sa_event = vi.fn();
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";

      const simpleProvider = new SimpleAnalyticsProvider();
      manager.registerProvider(simpleProvider);

      manager.trackEvent("export", "png", "canvas", 1);

      expect((window as any).sa_event).toHaveBeenCalledWith("png", {
        category: "export",
        label: "canvas",
        value: 1,
      });
    });

    it("should isolate provider failures", () => {
      const manager = new AnalyticsManager();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create a failing provider
      const failingProvider = {
        name: "FailingProvider",
        isEnabled: () => true,
        trackEvent: () => {
          throw new Error("Provider error");
        },
      };

      // Mock successful provider
      (window as any).sa_event = vi.fn();
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";

      const simpleProvider = new SimpleAnalyticsProvider();

      manager.registerProvider(failingProvider);
      manager.registerProvider(simpleProvider);

      // Should not throw
      expect(() => {
        manager.trackEvent("export", "png");
      }).not.toThrow();

      // Failing provider logged error
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Analytics] FailingProvider failed:",
        expect.any(Error),
      );

      // Successful provider still called
      expect((window as any).sa_event).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("SimpleAnalyticsProvider", () => {
    it("should be enabled when sa_event exists and tracking is on", () => {
      (window as any).sa_event = vi.fn();
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";

      const provider = new SimpleAnalyticsProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("should be disabled when tracking is off", () => {
      (window as any).sa_event = vi.fn();
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "false";

      const provider = new SimpleAnalyticsProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("should track events correctly", () => {
      (window as any).sa_event = vi.fn();
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";

      const provider = new SimpleAnalyticsProvider();
      provider.trackEvent("export", "png", "canvas", 100);

      expect((window as any).sa_event).toHaveBeenCalledWith("png", {
        category: "export",
        label: "canvas",
        value: 100,
      });
    });
  });

  describe("PostHogProvider", () => {
    it("should be enabled when posthog exists and tracking is on", () => {
      (window as any).posthog = { capture: vi.fn() };
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";
      (import.meta.env as any).VITE_APP_POSTHOG_ENABLED = "true";

      const provider = new PostHogProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("should be disabled when PostHog is disabled in env", () => {
      (window as any).posthog = { capture: vi.fn() };
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";
      (import.meta.env as any).VITE_APP_POSTHOG_ENABLED = "false";

      const provider = new PostHogProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("should track events with correct format", () => {
      const capturespy = vi.fn();
      (window as any).posthog = { capture: capturespy };
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";
      (import.meta.env as any).VITE_APP_POSTHOG_ENABLED = "true";
      (import.meta.env as any).PKG_VERSION = "1.0.0";
      (import.meta.env as any).MODE = "test";

      const provider = new PostHogProvider();
      provider.trackEvent("export", "png", "canvas", 100);

      expect(capturespy).toHaveBeenCalledWith("export:png", {
        category: "export",
        action: "png",
        label: "canvas",
        value: 100,
        app_version: "1.0.0",
        environment: "test",
      });
    });

    it("should track events without optional parameters", () => {
      const capturespy = vi.fn();
      (window as any).posthog = { capture: capturespy };
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";
      (import.meta.env as any).VITE_APP_POSTHOG_ENABLED = "true";
      (import.meta.env as any).PKG_VERSION = "1.0.0";
      (import.meta.env as any).MODE = "test";

      const provider = new PostHogProvider();
      provider.trackEvent("export", "png");

      expect(capturespy).toHaveBeenCalledWith("export:png", {
        category: "export",
        action: "png",
        app_version: "1.0.0",
        environment: "test",
      });
    });
  });

  describe("Privacy Compliance", () => {
    it("should not track PII in event properties", () => {
      const capturespy = vi.fn();
      (window as any).posthog = { capture: capturespy };
      (import.meta.env as any).VITE_APP_ENABLE_TRACKING = "true";
      (import.meta.env as any).VITE_APP_POSTHOG_ENABLED = "true";

      const provider = new PostHogProvider();
      provider.trackEvent("feature", "ai_used", "text-to-diagram");

      const [, properties] = capturespy.mock.calls[0];

      // Ensure no PII fields
      expect(properties).not.toHaveProperty("email");
      expect(properties).not.toHaveProperty("user_id");
      expect(properties).not.toHaveProperty("ip_address");
      expect(properties).not.toHaveProperty("name");
    });
  });
});
