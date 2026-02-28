import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import { registerSW } from "virtual:pwa-register";

import "../excalidraw-app/sentry";

import ExcalidrawApp from "./App";

// Import PostHog test utilities in dev/debug mode
if (
  import.meta.env.DEV ||
  import.meta.env.VITE_APP_POSTHOG_DEBUG === "true"
) {
  import("./posthog-test");
}

window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
registerSW();

// PostHog configuration with privacy-first settings
const posthogOptions = {
  api_host: import.meta.env.VITE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2026-01-30" as const,
  disable_session_recording: true, // Privacy: no session recording
  autocapture: false, // Manual events only
  capture_pageview: true, // ✅ Enable page tracking for Web Analytics
  respect_dnt: true, // Respect Do Not Track
  secure_cookie: true, // HTTPS only
  persistence: "localStorage" as const,
  loaded: (posthog: any) => {
    if (import.meta.env.VITE_APP_POSTHOG_DEBUG === "true") {
      posthog.debug();
    }
  },
};

// Enable PostHog in production, or in development when debug mode is on
const shouldEnablePostHog =
  import.meta.env.VITE_APP_POSTHOG_KEY &&
  import.meta.env.VITE_APP_POSTHOG_ENABLED === "true" &&
  (import.meta.env.PROD || import.meta.env.VITE_APP_POSTHOG_DEBUG === "true");

// Log PostHog initialization status
if (import.meta.env.DEV) {
  console.log("[PostHog] Initialization check:", {
    shouldEnable: shouldEnablePostHog,
    hasKey: !!import.meta.env.VITE_APP_POSTHOG_KEY,
    enabled: import.meta.env.VITE_APP_POSTHOG_ENABLED,
    isProd: import.meta.env.PROD,
    debugMode: import.meta.env.VITE_APP_POSTHOG_DEBUG,
  });
}

root.render(
  <StrictMode>
    {shouldEnablePostHog ? (
      <PostHogProvider
        apiKey={import.meta.env.VITE_APP_POSTHOG_KEY}
        options={posthogOptions}
      >
        <ExcalidrawApp />
      </PostHogProvider>
    ) : (
      <ExcalidrawApp />
    )}
  </StrictMode>,
);
