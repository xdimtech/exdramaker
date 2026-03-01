# PostHog 数据缺失问题诊断

## 🔍 问题诊断

如果在 PostHog 后台看不到任何数据，请按以下步骤检查：

---

## ❌ 问题 1: 环境变量配置错误

### 当前配置问题

**`.env.production` 中：**

```bash
VITE_APP_ENABLE_TRACKING=false  # ❌ 总开关关闭！
VITE_APP_POSTHOG_ENABLED=true
```

### ✅ 解决方案

**修改 `.env.production`：**

```bash
VITE_APP_ENABLE_TRACKING=true   # ✅ 开启总开关
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_cDJCC3Qom6hSPBeqDsyf0GwSuMkUbVpIrqERnDMz7hp
VITE_APP_POSTHOG_HOST=https://us.i.posthog.com
```

---

## ❌ 问题 2: 开发环境默认禁用追踪

### 当前代码逻辑

`packages/excalidraw/analytics.ts:60-63`：

```ts
if (isDevEnv()) {
  // comment out to debug in dev
  return; // ❌ 开发环境直接返回，不发送任何事件
}
```

### ✅ 解决方案 A：临时启用开发环境追踪

**修改 `packages/excalidraw/analytics.ts`：**

```ts
if (isDevEnv()) {
  // comment out to debug in dev
  // return;  // ✅ 注释掉这行以在开发环境测试
}
```

### ✅ 解决方案 B：使用生产构建测试

```bash
# 构建生产版本
yarn build

# 启动生产服务器
yarn start:production

# 或使用 preview 模式
yarn build:preview
```

---

## ❌ 问题 3: 禁用了自动事件捕获

### 当前配置

`excalidraw-app/index.tsx:19-21`：

```ts
autocapture: false,           // ❌ 不自动捕获点击等事件
capture_pageview: false,      // ❌ 不自动捕获页面浏览
```

**这是隐私优先设计，但意味着必须手动触发事件才能看到数据。**

### ✅ 解决方案：手动触发测试事件

在浏览器控制台执行：

```js
// 1. 检查 PostHog 是否已加载
window.posthog || console.error("PostHog not loaded!");

// 2. 手动发送测试事件
posthog.capture("test_event", {
  source: "manual",
  timestamp: new Date().toISOString(),
});

// 3. 查看 PostHog 状态
posthog.get_config();
```

---

## 🧪 完整诊断步骤

### 步骤 1: 检查 PostHog 初始化

打开浏览器控制台，执行：

```js
// 检查 PostHog 对象
console.log("PostHog loaded:", !!window.posthog);
console.log("PostHog config:", posthog?.get_config?.());

// 检查环境变量
console.log("Environment:", import.meta.env.MODE);
console.log("Tracking enabled:", import.meta.env.VITE_APP_ENABLE_TRACKING);
console.log("PostHog enabled:", import.meta.env.VITE_APP_POSTHOG_ENABLED);
console.log(
  "PostHog key:",
  import.meta.env.VITE_APP_POSTHOG_KEY?.substring(0, 10) + "...",
);
```

**预期输出：**

```
PostHog loaded: true
Environment: production
Tracking enabled: "true"
PostHog enabled: "true"
PostHog key: "phc_cDJCC3..."
```

### 步骤 2: 检查网络请求

1. 打开浏览器开发者工具 → Network 标签
2. 筛选 `posthog` 或 `i.posthog.com`
3. 执行一些操作（导出、创建元素等）
4. 查看是否有 POST 请求到 `https://us.i.posthog.com/e/`

**如果没有请求：**

- ✅ PostHog 未初始化或环境变量配置错误
- ✅ 代码中的 `trackEvent` 没有被调用

**如果有请求但失败：**

- ✅ API key 错误
- ✅ CORS 问题
- ✅ 网络问题

### 步骤 3: 强制发送测试事件

创建测试文件 `excalidraw-app/test-posthog.ts`：

```ts
import posthog from "posthog-js";

export function testPostHog() {
  console.log("PostHog test started");

  // 检查初始化状态
  if (!posthog.__loaded) {
    console.error("❌ PostHog not loaded!");
    return;
  }

  console.log("✅ PostHog loaded");
  console.log("Config:", posthog.get_config());

  // 发送测试事件
  posthog.capture("posthog_test_event", {
    test: true,
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
  });

  console.log("✅ Test event sent");

  // 5 秒后检查队列
  setTimeout(() => {
    console.log("PostHog queue:", posthog._queued_events || []);
  }, 5000);
}

// 在浏览器控制台调用: testPostHog()
if (typeof window !== "undefined") {
  (window as any).testPostHog = testPostHog;
}
```

在浏览器控制台执行：

```js
testPostHog();
```

### 步骤 4: 验证 API Key

确认 API key 是否正确：

1. 登录 [PostHog Dashboard](https://app.posthog.com)
2. 进入 **Settings** → **Project** → **Project API Key**
3. 复制 API key（格式：`phc_xxxxx`）
4. 与 `.env.production` 中的 `VITE_APP_POSTHOG_KEY` 对比

---

## 🚀 快速修复（推荐）

### 选项 A: 开发环境测试

1. **编辑 `packages/excalidraw/analytics.ts`：**

   ```ts
   if (isDevEnv()) {
     // return;  // ← 注释这行
   }
   ```

2. **重启开发服务器：**

   ```bash
   yarn start
   ```

3. **打开浏览器控制台，执行：**

   ```js
   posthog.capture("dev_test", { source: "console" });
   ```

4. **查看 PostHog Dashboard** → Live Events（实时事件）

### 选项 B: 生产环境测试

1. **修改 `.env.production`：**

   ```bash
   VITE_APP_ENABLE_TRACKING=true
   ```

2. **构建并运行：**

   ```bash
   yarn build
   yarn start:production
   ```

3. **执行测试操作：**

   - 导出画布为 PNG
   - 创建一些元素
   - 使用命令面板

4. **查看 PostHog Dashboard** → Events（可能有 1-2 分钟延迟）

---

## 📊 验证数据到达

### 在 PostHog Dashboard 中：

1. **Live Events（实时事件）：**

   - 导航到 **Activity** → **Live Events**
   - 应该实时看到事件流

2. **Events（历史事件）：**

   - 导航到 **Events**
   - 查看事件列表
   - 筛选事件类型（如 `export:png`）

3. **Web Analytics：**
   - 导航到 **Web Analytics**
   - 需要有 `pageview` 事件才会显示
   - **当前配置禁用了 pageview！**

### 启用 Web Analytics（可选）

如果需要 Web Analytics 数据，修改 `excalidraw-app/index.tsx`：

```ts
const posthogOptions = {
  api_host: import.meta.env.VITE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2026-01-30" as const,
  disable_session_recording: true,
  autocapture: false,
  capture_pageview: true, // ✅ 改为 true 启用页面浏览追踪
  respect_dnt: true,
  secure_cookie: true,
  persistence: "localStorage" as const,
};
```

**重新构建：**

```bash
yarn build:packages
```

---

## 🔥 常见错误

### 错误 1: "PostHog not loaded"

**原因：**

- 环境变量未设置
- `import.meta.env.PROD` 为 false（开发模式）

**解决：**

```bash
# 检查是否在生产模式
console.log(import.meta.env.PROD)  // 应该为 true

# 检查环境变量
console.log(import.meta.env.VITE_APP_POSTHOG_KEY)  // 应该有值
```

### 错误 2: "CORS error"

**原因：**

- API host 配置错误
- 使用了错误的域名

**解决：**

```bash
VITE_APP_POSTHOG_HOST=https://us.i.posthog.com  # 美国云
# 或
VITE_APP_POSTHOG_HOST=https://eu.i.posthog.com  # 欧洲云
# 或
VITE_APP_POSTHOG_HOST=https://app.posthog.com   # 自托管
```

### 错误 3: "401 Unauthorized"

**原因：**

- API key 错误或过期

**解决：**

- 在 PostHog Dashboard 重新生成 API key
- 更新 `.env.production`

---

## 📞 还是没有数据？

提供以下信息以便进一步诊断：

```js
// 在浏览器控制台运行，复制输出
JSON.stringify(
  {
    posthogLoaded: !!window.posthog,
    config: posthog?.get_config?.(),
    env: {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      tracking: import.meta.env.VITE_APP_ENABLE_TRACKING,
      posthogEnabled: import.meta.env.VITE_APP_POSTHOG_ENABLED,
      hasKey: !!import.meta.env.VITE_APP_POSTHOG_KEY,
      host: import.meta.env.VITE_APP_POSTHOG_HOST,
    },
    userAgent: navigator.userAgent,
  },
  null,
  2,
);
```

---

## ✅ 成功标志

当配置正确时，你应该看到：

1. **浏览器控制台：**

   ```
   [Analytics] PostHog initialized
   ```

2. **Network 标签：**

   - POST 请求到 `https://us.i.posthog.com/e/`
   - 状态码 200

3. **PostHog Dashboard → Live Events：**

   - 实时显示事件
   - 事件格式：`category:action`（如 `export:png`）

4. **PostHog Dashboard → Events：**
   - 事件列表中有数据
   - 每个事件包含 `category`, `action`, `label`, `value` 属性
