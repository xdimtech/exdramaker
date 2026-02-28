/**
 * PostHog Test Utilities
 *
 * 在浏览器控制台中使用这些函数来诊断和测试 PostHog 集成。
 *
 * 用法：
 * 1. 在浏览器中打开应用
 * 2. 打开开发者工具控制台
 * 3. 输入 `window.posthogTest.checkStatus()` 查看状态
 * 4. 输入 `window.posthogTest.sendTest()` 发送测试事件
 */

import posthog from "posthog-js";

export const posthogTest = {
  /**
   * 检查 PostHog 状态
   */
  checkStatus() {
    console.group("🔍 PostHog Status Check");

    // 1. 基本状态
    console.log("✅ PostHog loaded:", posthog.__loaded);
    console.log("Environment:", import.meta.env.MODE);
    console.log("Is Production:", import.meta.env.PROD);

    // 2. 环境变量
    console.group("Environment Variables");
    console.log(
      "VITE_APP_ENABLE_TRACKING:",
      import.meta.env.VITE_APP_ENABLE_TRACKING,
    );
    console.log(
      "VITE_APP_POSTHOG_ENABLED:",
      import.meta.env.VITE_APP_POSTHOG_ENABLED,
    );
    console.log(
      "VITE_APP_POSTHOG_KEY:",
      import.meta.env.VITE_APP_POSTHOG_KEY?.substring(0, 10) + "...",
    );
    console.log(
      "VITE_APP_POSTHOG_HOST:",
      import.meta.env.VITE_APP_POSTHOG_HOST,
    );
    console.groupEnd();

    // 3. PostHog 配置
    if (posthog.__loaded) {
      console.group("PostHog Configuration");
      try {
        // Access config from internal property
        const config = (posthog as any).config || (posthog as any)._config;
        if (config) {
          console.log("API Host:", config.api_host);
          console.log("Autocapture:", config.autocapture);
          console.log("Capture Pageview:", config.capture_pageview);
          console.log("Session Recording:", !config.disable_session_recording);
          console.log("Persistence:", config.persistence);
        } else {
          console.log("✅ PostHog is loaded and ready");
        }
      } catch (e) {
        console.log("✅ PostHog is loaded and ready");
      }
      console.groupEnd();
    } else {
      console.warn("⚠️ PostHog not loaded!");
      console.log(
        "Reasons:",
        "\n  - Not in production mode (import.meta.env.PROD = false)",
        "\n  - VITE_APP_POSTHOG_ENABLED is not 'true'",
        "\n  - VITE_APP_POSTHOG_KEY is missing",
      );
    }

    console.groupEnd();

    return {
      loaded: posthog.__loaded,
      environment: import.meta.env.MODE,
      tracking_enabled: import.meta.env.VITE_APP_ENABLE_TRACKING === "true",
      posthog_enabled: import.meta.env.VITE_APP_POSTHOG_ENABLED === "true",
    };
  },

  /**
   * 发送测试事件
   */
  sendTest() {
    if (!posthog.__loaded) {
      console.error("❌ PostHog not loaded. Run checkStatus() for details.");
      return false;
    }

    console.group("🧪 Sending Test Event");

    const eventName = "posthog_test_event";
    const properties = {
      test: true,
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent.split(" ").pop(),
      screen: `${window.screen.width}x${window.screen.height}`,
      source: "posthog-test-utilities",
    };

    console.log("Event Name:", eventName);
    console.log("Properties:", properties);

    try {
      posthog.capture(eventName, properties);
      console.log("✅ Event sent successfully!");
      console.log(
        "📊 Check PostHog Dashboard → Activity → Live Events (may take 1-2 minutes)",
      );
      console.log("🔗 https://app.posthog.com/events");
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("❌ Error sending event:", error);
      console.groupEnd();
      return false;
    }
  },

  /**
   * 连续发送多个测试事件
   */
  sendMultiple(count = 5) {
    console.log(`🧪 Sending ${count} test events...`);

    let sent = 0;
    const interval = setInterval(() => {
      if (sent >= count) {
        clearInterval(interval);
        console.log(`✅ Sent ${count} test events`);
        return;
      }

      posthog.capture(`test_event_${sent + 1}`, {
        test: true,
        sequence: sent + 1,
        total: count,
        timestamp: new Date().toISOString(),
      });

      sent++;
      console.log(`  ${sent}/${count} sent`);
    }, 1000);
  },

  /**
   * 模拟用户操作事件
   */
  simulateUserEvents() {
    console.log("🎭 Simulating user events...");

    const events = [
      { category: "export", action: "png", label: "test" },
      { category: "element", action: "create", label: "rectangle" },
      { category: "clipboard", action: "copy" },
      { category: "selection", action: "select", value: 3 },
      { category: "feature", action: "ai_used", label: "text-to-diagram" },
    ];

    events.forEach((event, index) => {
      setTimeout(() => {
        posthog.capture(`${event.category}:${event.action}`, {
          category: event.category,
          action: event.action,
          label: event.label,
          value: event.value,
          app_version: import.meta.env.PKG_VERSION || "unknown",
          environment: import.meta.env.MODE || "production",
        });
        console.log(`  ✅ ${event.category}:${event.action}`);
      }, index * 500);
    });

    setTimeout(() => {
      console.log("✅ All simulated events sent");
    }, events.length * 500 + 100);
  },

  /**
   * 监控网络请求
   */
  monitorNetwork() {
    console.log("🌐 Monitoring PostHog network requests...");
    console.log("Open DevTools → Network → Filter 'posthog'");
    console.log(
      "Look for POST requests to: https://us.i.posthog.com/e/ or /decide",
    );
    console.log(
      "\nExpected requests:",
      "\n  1. POST /decide/ - Feature flags (if enabled)",
      "\n  2. POST /e/ - Events",
    );
  },

  /**
   * 获取完整诊断信息
   */
  getDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      posthog: {
        loaded: posthog.__loaded,
        config: posthog.__loaded
          ? (posthog as any).config || (posthog as any)._config || "Available"
          : null,
      },
      environment: {
        mode: import.meta.env.MODE,
        prod: import.meta.env.PROD,
        dev: import.meta.env.DEV,
      },
      variables: {
        VITE_APP_ENABLE_TRACKING: import.meta.env.VITE_APP_ENABLE_TRACKING,
        VITE_APP_POSTHOG_ENABLED: import.meta.env.VITE_APP_POSTHOG_ENABLED,
        VITE_APP_POSTHOG_KEY: import.meta.env.VITE_APP_POSTHOG_KEY
          ? import.meta.env.VITE_APP_POSTHOG_KEY.substring(0, 10) + "..."
          : "NOT SET",
        VITE_APP_POSTHOG_HOST: import.meta.env.VITE_APP_POSTHOG_HOST,
        VITE_APP_POSTHOG_DEBUG: import.meta.env.VITE_APP_POSTHOG_DEBUG,
      },
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
      },
    };

    console.log("📋 Diagnostics:");
    console.log(JSON.stringify(diagnostics, null, 2));

    return diagnostics;
  },

  /**
   * 显示帮助信息
   */
  help() {
    console.log(`
🔧 PostHog Test Utilities - Available Commands:

  window.posthogTest.checkStatus()
    → Check PostHog initialization status

  window.posthogTest.sendTest()
    → Send a single test event

  window.posthogTest.sendMultiple(5)
    → Send multiple test events (default: 5)

  window.posthogTest.simulateUserEvents()
    → Simulate realistic user interaction events

  window.posthogTest.monitorNetwork()
    → Show instructions for monitoring network requests

  window.posthogTest.getDiagnostics()
    → Get full diagnostic information

  window.posthogTest.help()
    → Show this help message

📚 Documentation:
  - Troubleshooting: docs/posthog-troubleshooting.md
  - Migration Guide: docs/posthog-migration.md
    `);
  },
};

// 在开发环境中自动挂载到 window
if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || import.meta.env.VITE_APP_POSTHOG_DEBUG === "true")
) {
  (window as any).posthogTest = posthogTest;
  console.log(
    "🔧 PostHog test utilities loaded. Type window.posthogTest.help() for commands.",
  );
}
