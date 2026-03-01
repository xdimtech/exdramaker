# PostHog 官方集成 - 快速参考

## ✅ 迁移完成

已成功将 PostHog 从自定义 loader snippet 迁移到官方 NPM 包。

## 📦 新增依赖

```bash
posthog-js@1.356.1
@posthog/react@1.8.1
```

## 🔧 关键变更

### 1. 应用初始化 (`excalidraw-app/index.tsx`)

```tsx
import { PostHogProvider } from "@posthog/react";

// 使用 PostHogProvider 包裹应用
<PostHogProvider apiKey={key} options={options}>
  <ExcalidrawApp />
</PostHogProvider>;
```

### 2. Provider 实现 (`packages/excalidraw/analytics/providers/posthog.ts`)

```ts
import posthog from "posthog-js";

// 使用 posthog 对象而非 window.posthog
posthog.capture(eventName, properties);
```

## 🧪 测试验证

```bash
✅ yarn test:app -- packages/excalidraw/tests/analytics.test.ts
   → 11/11 tests passed

✅ yarn build:packages
   → Build successful

✅ ESLint & Prettier
   → No linting errors in modified files
```

## 🚀 使用方式

**无需改动现有代码！** `trackEvent` API 保持不变：

```ts
import { trackEvent } from "./analytics";

trackEvent("export", "png", "toolbar", 1);
```

## 🔐 隐私设置（保持不变）

- ✅ 禁用会话录制 (`disable_session_recording: true`)
- ✅ 禁用自动捕获 (`autocapture: false`)
- ✅ 禁用自动页面追踪 (`capture_pageview: false`)
- ✅ 尊重 DNT (`respect_dnt: true`)
- ✅ 仅限 HTTPS (`secure_cookie: true`)

## 📚 文档

详细迁移文档：`docs/posthog-migration.md`

## 🎯 优势

| 特性             | 提升               |
| ---------------- | ------------------ |
| TypeScript 支持  | ✅ 完整类型安全    |
| React 集成       | ✅ 原生 hooks      |
| 版本管理         | ✅ 锁定 npm 版本   |
| 离线开发         | ✅ 本地可用        |
| 测试友好         | ✅ 易于 mock       |
| 自动优化配置     | ✅ `defaults` 选项 |
| 与项目技术栈一致 | ✅ 符合 React 规范 |
