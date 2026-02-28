# 在开发环境启用 PostHog 调试

## 问题原因

PostHog 默认**仅在生产环境加载**，以避免开发环境产生大量测试数据。

检查结果：
```
✅ PostHog loaded: false  ← PostHog 未加载
Environment: development   ← 开发环境
Is Production: false       ← 不是生产模式
```

## ✅ 解决方案：启用开发环境调试

### 步骤 1: 确认环境变量

`.env.development` 中应该有：

```bash
VITE_APP_POSTHOG_DEBUG=true  # ✅ 关键：启用调试模式
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_cDJCC3Qom6hSPBeqDsyf0GwSuMkUbVpIrqERnDMz7hp
VITE_APP_POSTHOG_HOST=https://us.i.posthog.com
VITE_APP_ENABLE_TRACKING=true
```

### 步骤 2: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
yarn start
```

### 步骤 3: 验证加载

刷新浏览器，打开控制台，应该看到：

```
[PostHog] Initialization check: {
  shouldEnable: true,
  hasKey: true,
  enabled: "true",
  isProd: false,
  debugMode: "true"
}
```

### 步骤 4: 再次检查

```js
window.posthogTest.checkStatus()
```

**预期输出：**
```
✅ PostHog loaded: true  ← 现在应该是 true
Environment: development
VITE_APP_POSTHOG_DEBUG: true
```

---

## 🔧 新逻辑说明

### 修改前（仅生产环境）

```ts
// ❌ 只在生产环境启用
const shouldEnablePostHog =
  import.meta.env.PROD &&
  import.meta.env.VITE_APP_POSTHOG_ENABLED === "true";
```

### 修改后（生产 + 调试模式）

```ts
// ✅ 生产环境 OR 开发环境且启用调试
const shouldEnablePostHog =
  import.meta.env.VITE_APP_POSTHOG_KEY &&
  import.meta.env.VITE_APP_POSTHOG_ENABLED === "true" &&
  (import.meta.env.PROD || import.meta.env.VITE_APP_POSTHOG_DEBUG === "true");
```

**启用条件：**
- ✅ 有 API Key
- ✅ `VITE_APP_POSTHOG_ENABLED=true`
- ✅ **生产环境** 或 **调试模式开启**

---

## 🧪 测试步骤

### 1. 重启后立即检查

```js
// 应该看到初始化日志
console.log(window.posthog)  // 应该是对象，不是 undefined

// 检查加载状态
posthog.__loaded  // 应该为 true
```

### 2. 发送测试事件

```js
window.posthogTest.sendTest()
```

**预期输出：**
```
🧪 Sending Test Event
Event Name: posthog_test_event
✅ Event sent successfully!
📊 Check PostHog Dashboard → Activity → Live Events
```

### 3. 在 PostHog Dashboard 查看

1. 打开 [PostHog Dashboard](https://app.posthog.com)
2. 进入 **Activity** → **Live Events**
3. 应该在 1-2 秒内看到 `posthog_test_event`

### 4. 模拟真实操作

```js
window.posthogTest.simulateUserEvents()
```

应该看到：
- `export:png`
- `element:create`
- `clipboard:copy`
- `selection:select`
- `feature:ai_used`

---

## 🚨 常见问题

### Q1: 重启后还是 `PostHog loaded: false`

**检查：**
```bash
# 1. 确认环境变量文件
cat .env.development | grep POSTHOG

# 应该看到：
VITE_APP_POSTHOG_DEBUG=true
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_...
```

**如果没有 `VITE_APP_POSTHOG_DEBUG=true`：**
```bash
echo "VITE_APP_POSTHOG_DEBUG=true" >> .env.development
yarn start
```

### Q2: 看到 "PostHog loaded: true" 但事件不发送

**检查：**
```js
// 查看 analytics 日志
// 应该看到：
[Analytics] Dev mode tracking enabled (debug mode)
```

**如果没看到：**
- 确认 `VITE_APP_ENABLE_TRACKING=true`
- 确认事件类别在允许列表中（见下方）

### Q3: 某些事件不发送

**允许的事件类别：**
```ts
// packages/excalidraw/analytics.ts
const ALLOWED_CATEGORIES_TO_TRACK = new Set([
  "command_palette",
  "export",
  "element",
  "clipboard",
  "selection",
  "share",
  "feature",
  "app",
]);
```

**测试允许的事件：**
```js
// ✅ 会发送
posthog.capture('export:png', { category: 'export', action: 'png' })

// ❌ 不会发送（category 不在列表中）
posthog.capture('unknown:action', { category: 'unknown' })
```

---

## 🎯 快速启用命令

一键配置并启动：

```bash
# 1. 添加调试标志（如果还没有）
grep -q "VITE_APP_POSTHOG_DEBUG" .env.development || echo "VITE_APP_POSTHOG_DEBUG=true" >> .env.development

# 2. 重启服务器
yarn start
```

---

## 📊 验证成功

### 浏览器控制台应该显示：

```
[PostHog] Initialization check: {
  shouldEnable: true,
  hasKey: true,
  enabled: "true",
  isProd: false,
  debugMode: "true"
}

🔧 PostHog test utilities loaded. Type window.posthogTest.help() for commands.
```

### 运行状态检查：

```js
window.posthogTest.checkStatus()
```

**成功输出：**
```
🔍 PostHog Status Check
✅ PostHog loaded: true          ← 现在是 true！
Environment: development
VITE_APP_POSTHOG_DEBUG: "true"  ← 调试模式已启用

PostHog Configuration
  API Host: https://us.i.posthog.com
  Autocapture: false
  Capture Pageview: false
  Session Recording: false
  Persistence: localStorage
```

---

## 🔄 切换生产模式测试

如果需要测试生产构建：

```bash
# 1. 构建生产版本
yarn build

# 2. 启动生产服务器
yarn start:production

# 3. 访问 http://localhost:5001
# 4. PostHog 会自动加载（无需调试标志）
```

---

## 🎉 完成

完成以上步骤后：
- ✅ PostHog 在开发环境加载
- ✅ 可以实时测试事件
- ✅ 可以在 PostHog Dashboard 查看数据
- ✅ 不影响生产环境配置

**开发完成后记得：**
- 关闭调试模式：`VITE_APP_POSTHOG_DEBUG=false`
- 或在生产环境测试（自动禁用调试数据）
