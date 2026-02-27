# PostHog Analytics Integration

This document describes the PostHog analytics integration for Excalidraw, implemented alongside the existing Simple Analytics.

## Overview

The application uses a **multi-provider analytics system** that dispatches events to multiple analytics services:

- **Simple Analytics** - Privacy-friendly page view and basic event tracking (existing)
- **PostHog** - Advanced product analytics for user behavior insights (new)

Both providers run in parallel, with isolated failure handling - if one provider fails, the other continues working.

## Architecture

### Provider System

```
Application Code (trackEvent calls)
           ↓
    AnalyticsManager
    ├── Simple Analytics Provider
    └── PostHog Provider
```

**Benefits:**

- Single API for all tracking calls
- Easy to add/remove providers
- Provider failures are isolated
- Backward compatible with existing code

### File Structure

```
packages/excalidraw/
├── analytics.ts                      # Public API and configuration
├── analytics/
│   ├── types.ts                     # TypeScript interfaces
│   ├── manager.ts                   # AnalyticsManager class
│   ├── providers/
│   │   ├── simple-analytics.ts     # Simple Analytics provider
│   │   └── posthog.ts              # PostHog provider
│   └── index.ts                     # Exports
```

## Setup Instructions

### 1. Create PostHog Account

1. Sign up at [https://app.posthog.com](https://app.posthog.com)
2. Create two projects:
   - **Excalidraw Dev** (for development)
   - **Excalidraw Prod** (for production)

### 2. Get API Keys

1. Go to **Project Settings > Project API Key**
2. Copy the API key (format: `phc_xxxxxxxxxxxxxxxxxxxxx`)
3. Do this for both dev and prod projects

### 3. Configure Environment

**For Development:**

Create `.env.local` in the project root:

```bash
# Enable PostHog
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_YOUR_DEV_KEY_HERE
VITE_APP_POSTHOG_HOST=https://app.posthog.com
VITE_APP_POSTHOG_DEBUG=true

# Enable tracking
VITE_APP_ENABLE_TRACKING=true
```

**For Production:**

Add to `.env.production` or set in your deployment environment:

```bash
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_YOUR_PROD_KEY_HERE
VITE_APP_POSTHOG_HOST=https://app.posthog.com
VITE_APP_POSTHOG_DEBUG=false
VITE_APP_ENABLE_TRACKING=true
```

### 4. Verify Setup

1. Start dev server: `yarn start`
2. Open browser console
3. Trigger a tracked action (e.g., export, command palette)
4. Look for: `[Analytics] PostHog: export:png`
5. Check PostHog dashboard for incoming events

## Usage

### Tracking Events

Use the existing `trackEvent` API - no code changes needed:

```typescript
import { trackEvent } from "./analytics";

// Track an event
trackEvent("export", "png", "canvas", 1);
// Format: category:action in PostHog
// Result: "export:png" event with properties: { category, action, label, value }

// Track without optional parameters
trackEvent("command_palette", "open");
// Result: "command_palette:open" event
```

### Tracked Categories

The following event categories are currently tracked:

| Category | Description | Examples |
| --- | --- | --- |
| `command_palette` | Command palette usage | `open`, `execute` |
| `export` | Export operations | `png`, `svg`, `json`, `clipboard` |
| `element` | Element operations | `created`, `deleted`, `modified` |
| `clipboard` | Clipboard operations | `copy`, `paste`, `cut` |
| `selection` | Selection operations | `select`, `deselect` |
| `share` | Collaboration features | `room_created`, `room_joined` |
| `feature` | Feature usage | `ai_used`, `text_to_diagram`, `library_opened` |
| `app` | App lifecycle | `load`, `error`, `performance` |

To add new categories, edit `ALLOWED_CATEGORIES_TO_TRACK` in `packages/excalidraw/analytics.ts:12`.

### Event Properties

Every event includes:

- `category` - Event category (string)
- `action` - Event action (string)
- `label` - Optional label (string)
- `value` - Optional numeric value (number)
- `app_version` - Application version (auto-added)
- `environment` - Environment (development/production, auto-added)

## Privacy & GDPR Compliance

### Anonymous Tracking Only

**We NEVER track:**

- User emails, names, or IDs
- IP addresses (PostHog hashes IPs)
- Drawing content or element data
- Personal file names
- Collaboration partner information

**We ONLY track:**

- Event categories and actions (e.g., "export:png")
- Feature usage counts
- Anonymous session duration
- App version and device type
- Browser/OS type (from user agent)

### PostHog Configuration

PostHog is configured with privacy-first settings:

```javascript
{
  disable_session_recording: true,   // NO screen recording
  autocapture: false,                 // NO automatic DOM capture
  capture_pageview: false,            // Manual page tracking only
  respect_dnt: true,                  // Honor Do Not Track header
  secure_cookie: true,                // HTTPS only
  persistence: 'localStorage',        // Browser storage
}
```

### User Control

Users can disable all tracking by:

1. Setting `Do Not Track` header in their browser
2. Blocking scripts via browser extension
3. Setting `VITE_APP_ENABLE_TRACKING=false` (master switch)

## Development

### Running Tests

```bash
# Run all tests
yarn test:app

# Run analytics tests only
yarn test:app -- analytics.test.ts

# Run with coverage
yarn test:coverage
```

### Debug Mode

Enable debug logging in development:

```bash
# In .env.local
VITE_APP_POSTHOG_DEBUG=true
```

Then check browser console for detailed event logs:

```
[Analytics] Registered provider: Simple Analytics
[Analytics] Registered provider: PostHog
[Analytics] PostHog: { category: 'export', action: 'png', label: 'canvas', value: 1 }
```

### Adding a New Provider

1. Create provider class implementing `AnalyticsProvider`:

```typescript
// packages/excalidraw/analytics/providers/custom.ts
import type { AnalyticsProvider } from "../types";

export class CustomProvider implements AnalyticsProvider {
  name = "Custom Analytics";

  isEnabled(): boolean {
    return (
      typeof window !== "undefined" &&
      window.customAnalytics &&
      import.meta.env.VITE_APP_CUSTOM_ENABLED === "true"
    );
  }

  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
  ): void {
    if (!this.isEnabled()) return;

    try {
      window.customAnalytics.track({
        event: `${category}:${action}`,
        properties: { label, value },
      });
    } catch (error) {
      console.error("[Analytics] Custom Analytics error:", error);
    }
  }
}
```

2. Register in `analytics.ts`:

```typescript
import { CustomProvider } from "./analytics/providers/custom";

analyticsManager.registerProvider(new CustomProvider());
```

## Monitoring

### Key Metrics

**Technical:**

- Event delivery rate: Target >99%
- Error rate: Target <1%
- Performance overhead: <50ms per event

**Business:**

- Track 10,000+ events per day
- Identify top 10 most-used features
- Understand export format preferences
- Measure feature adoption rates

### PostHog Dashboard

Access your analytics at:

- Dev: https://app.posthog.com/project/YOUR_DEV_PROJECT_ID
- Prod: https://app.posthog.com/project/YOUR_PROD_PROJECT_ID

**Recommended Views:**

1. **Events** - See all tracked events in real-time
2. **Insights** - Create custom charts and funnels
3. **Dashboards** - Build product overview dashboard
4. **Feature Flags** (future) - A/B testing capabilities

## Troubleshooting

### Events Not Appearing in PostHog

1. Check `VITE_APP_POSTHOG_ENABLED=true`
2. Check `VITE_APP_ENABLE_TRACKING=true`
3. Check `VITE_APP_POSTHOG_KEY` is set correctly
4. Open browser console and look for `[Analytics] PostHog:` logs
5. Check PostHog project API key is correct
6. Verify network tab shows requests to PostHog API

### Console Errors

**"posthog is not defined":**

- PostHog script didn't load (check network tab)
- Check `VITE_APP_POSTHOG_KEY` is set in environment
- Verify script is in production build (`index.html`)

**"[Analytics] PostHog failed":**

- Check browser console for detailed error
- Verify PostHog project is active
- Check API key permissions

### Performance Issues

If analytics impacts performance:

1. Check event volume (should be <1000/min)
2. Verify providers are failing gracefully
3. Consider lazy-loading PostHog script
4. Review error logs for repeated failures

## Rollback

### Quick Disable (No Code Changes)

Set environment variable:

```bash
VITE_APP_POSTHOG_ENABLED=false
```

Redeploy application. PostHog disabled, Simple Analytics continues.

### Complete Removal

1. Remove PostHog script from `excalidraw-app/index.html:249-298`
2. Remove PostHog provider registration from `analytics.ts:28`
3. Redeploy

## References

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Privacy Controls](https://posthog.com/docs/privacy)
- [Simple Analytics](https://simpleanalytics.com)
- [GDPR Compliance Guide](https://gdpr.eu)

## Support

For issues or questions:

1. Check this documentation
2. Review browser console for errors
3. Check PostHog status page: https://status.posthog.com
4. Open issue in project repository
