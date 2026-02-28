# PostHog 官方集成迁移完成

## 迁移摘要

已将 PostHog 集成从自定义 loader snippet 迁移到官方 NPM 包 `posthog-js` + `@posthog/react`。

## 主要变更

### 1. 依赖变更

**新增依赖：**

```json
{
  "posthog-js": "^1.356.1",
  "@posthog/react": "^1.8.1"
}
```

**位置：** `excalidraw-app/package.json`

### 2. 代码变更

#### excalidraw-app/index.tsx

- 移除 `initPostHog()` 函数调用
- 添加 `<PostHogProvider>` React 组件包裹应用
- 仅在生产环境且配置启用时初始化 PostHog
- 保留所有隐私设置（禁用会话录制、自动捕获等）

**关键配置：**

```tsx
const posthogOptions = {
  api_host: import.meta.env.VITE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2026-01-30" as const,
  disable_session_recording: true,
  autocapture: false,
  capture_pageview: false,
  respect_dnt: true,
  secure_cookie: true,
  persistence: "localStorage" as const,
};
```

#### packages/excalidraw/analytics/providers/posthog.ts

- 从 `posthog-js` 导入 `posthog` 对象
- 使用 `posthog.__loaded` 检查初始化状态
- 移除 `window.posthog` 全局对象依赖

**变更前：**

```ts
window.posthog?.capture(eventName, properties);
```

**变更后：**

```ts
import posthog from "posthog-js";

posthog.capture(eventName, properties);
```

### 3. 删除文件

- ✅ `analytics/init-posthog.ts` - 旧的 loader snippet 初始化代码

### 4. 环境变量

无变更，继续使用现有环境变量：

```bash
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_xxxxx
VITE_APP_POSTHOG_HOST=https://us.i.posthog.com
VITE_APP_POSTHOG_DEBUG=false
VITE_APP_ENABLE_TRACKING=true
```

## 优势

### 相比旧方式的改进

| 特性                 | 旧方式（Snippet） | 新方式（NPM）      |
| -------------------- | ----------------- | ------------------ |
| **类型安全**         | ❌ 手动类型声明   | ✅ 完整 TypeScript |
| **React 集成**       | ⚠️ 手动封装       | ✅ 原生 hooks      |
| **版本控制**         | ❌ 依赖 CDN       | ✅ 锁定版本        |
| **离线开发**         | ❌ 需要网络       | ✅ 本地可用        |
| **自动优化配置**     | ❌ 手动配置       | ✅ `defaults`      |
| **Bundle 体积**      | ✅ 异步加载       | ⚠️ +100KB          |
| **初始化性能**       | ✅ 非阻塞         | ⚠️ 初始 bundle 增  |
| **测试友好**         | ⚠️ Mock window    | ✅ Mock npm 包     |
| **开发体验**         | ⚠️ 普通           | ✅ 优秀            |
| **与 React 的一致性** | ⚠️ 普通           | ✅ 符合 hooks 规范 |

## 测试验证

### 构建验证

```bash
✅ yarn build:packages  # 包构建成功
✅ eslint 检查           # 无 linting 错误
✅ TypeScript 检查       # 无类型错误
```

### 运行时验证

1. **启动开发服务器：**

   ```bash
   yarn start
   ```

2. **检查 PostHog 初始化：**

   打开浏览器控制台，确认：

   - 没有加载 `/static/array.js` 的网络请求（旧方式）
   - PostHog 通过 npm 包正确初始化
   - 事件正常发送到 PostHog

3. **验证事件追踪：**
   - 执行一些操作（导出、创建元素等）
   - 在 PostHog Dashboard 查看事件是否到达

## 向后兼容性

✅ **完全兼容** - `trackEvent` API 保持不变

现有代码无需修改：

```ts
trackEvent("export", "png", "toolbar", 1);
```

## 未来增强

使用官方包后，可以轻松使用高级功能：

1. **Feature Flags：**

   ```tsx
   import { useFeatureFlagEnabled } from "@posthog/react";

   const isNewUIEnabled = useFeatureFlagEnabled("new-ui");
   ```

2. **A/B Testing：**

   ```tsx
   const variant = useFeatureFlag("experiment-key");
   ```

3. **用户识别：**
   ```ts
   posthog.identify("user-id", {
     email: "user@example.com",
     plan: "pro",
   });
   ```

## 回滚计划

如需回滚到旧方式：

1. 恢复 `analytics/init-posthog.ts`
2. 恢复 `excalidraw-app/index.tsx` 中的 `initPostHog()` 调用
3. 移除 `<PostHogProvider>`
4. 卸载 npm 包：`yarn remove posthog-js @posthog/react`

## 参考资料

- [PostHog React 集成文档](https://posthog.com/docs/libraries/react)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [官方迁移指南](https://posthog.com/docs/migrate)
