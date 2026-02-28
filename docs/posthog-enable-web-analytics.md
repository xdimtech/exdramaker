# 启用 Web Analytics（可选）

## 当前状态

✅ **Activity → Live Events** - 有数据（自定义事件）
❌ **Web Analytics** - 大部分为空（缺少 pageview）
✅ **Web Analytics → Performance** - 有数据（Web Vitals）

---

## 为什么 Web Analytics 是空的？

### Web Analytics 需要这些事件：

| 事件类型 | 当前状态 | 说明 |
|---------|---------|------|
| `$pageview` | ❌ 禁用 | 页面浏览追踪 |
| `$pageleave` | ❌ 禁用 | 页面离开追踪 |
| `$autocapture` | ❌ 禁用 | 自动捕获点击 |
| `$web_vitals` | ✅ 启用 | 性能指标（你已经有了）|

### 我们的隐私优先配置：

```ts
// excalidraw-app/index.tsx:28-29
autocapture: false,         // 不自动捕获按钮点击
capture_pageview: false,    // 不自动追踪页面浏览
```

**设计原因：**
- ✅ 隐私友好 - 只追踪明确定义的业务事件
- ✅ 数据精准 - 避免噪音数据
- ✅ 性能优化 - 减少追踪开销

---

## 🔧 选项 1: 启用基础 Web Analytics

### 启用页面浏览追踪

**修改 `excalidraw-app/index.tsx` 第 29 行：**

```ts
// 修改前
capture_pageview: false,    // ❌ Manual page tracking

// 修改后
capture_pageview: true,     // ✅ Enable page tracking
```

**启用后会获得：**
- ✅ 页面浏览统计
- ✅ 访客趋势图
- ✅ 页面路径分析
- ✅ Web Analytics 完整功能

**重新构建：**
```bash
yarn build:packages
# 开发环境重启
yarn start
# 或生产环境
yarn build && yarn start:production
```

---

## 🔧 选项 2: 完全启用 Web Analytics（包含自动捕获）

### 启用自动捕获 + 页面浏览

**修改 `excalidraw-app/index.tsx` 第 28-29 行：**

```ts
// 修改前
autocapture: false,         // Manual events only
capture_pageview: false,    // Manual page tracking

// 修改后
autocapture: true,          // ✅ Enable auto-capture
capture_pageview: true,     // ✅ Enable page tracking
```

**启用后会获得：**
- ✅ 所有选项 1 的功能
- ✅ 自动捕获按钮点击
- ✅ 自动捕获表单提交
- ✅ 更丰富的用户行为数据

**⚠️ 注意：**
- 会收集更多数据（但仍然隐私友好）
- 可能增加网络请求
- 需要在隐私政策中说明

---

## 🎯 推荐配置

### 适合大多数场景：启用 Pageview（选项 1）

```ts
const posthogOptions = {
  api_host: import.meta.env.VITE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2026-01-30" as const,

  // 隐私设置（保持不变）
  disable_session_recording: true,  // ✅ 保持禁用
  respect_dnt: true,                // ✅ 保持启用
  secure_cookie: true,              // ✅ 保持启用

  // 数据收集（调整）
  autocapture: false,               // ❌ 保持禁用（手动事件更精准）
  capture_pageview: true,           // ✅ 启用页面浏览

  persistence: "localStorage" as const,
  loaded: (posthog: any) => {
    if (import.meta.env.VITE_APP_POSTHOG_DEBUG === "true") {
      posthog.debug();
    }
  },
};
```

---

## 📊 启用前后对比

### 当前配置（隐私优先）

**优点：**
- ✅ 最小化数据收集
- ✅ 精准的业务事件
- ✅ 更好的性能

**缺点：**
- ❌ Web Analytics 页面大部分为空
- ❌ 无法追踪页面浏览量
- ❌ 无法分析用户路径

**数据位置：**
- **Product Analytics → Events** - ✅ 所有自定义事件
- **Activity → Live Events** - ✅ 实时事件流
- **Web Analytics** - ⚠️ 仅 Web Vitals

---

### 启用 Pageview 后

**优点：**
- ✅ 所有当前优点
- ✅ Web Analytics 完整功能
- ✅ 页面浏览统计
- ✅ 用户路径分析

**缺点：**
- ⚠️ 轻微增加数据量
- ⚠️ 需要在隐私政策中说明

**数据位置：**
- **Product Analytics → Events** - ✅ 所有事件 + pageview
- **Activity → Live Events** - ✅ 实时事件流
- **Web Analytics** - ✅ 完整功能

---

## 🧪 测试启用效果

### 步骤 1: 修改配置

按照上面的选项修改 `excalidraw-app/index.tsx`

### 步骤 2: 重启服务器

```bash
yarn start
```

### 步骤 3: 刷新浏览器

打开控制台，应该看到：

```
[PostHog.js] send "$pageview" {...}
```

### 步骤 4: 在 PostHog 验证

1. **Activity → Live Events** - 应该看到 `$pageview` 事件
2. 等待 1-2 分钟
3. **Web Analytics** - 刷新页面，应该有数据了

---

## 🎯 快速测试命令

### 手动触发 Pageview（不修改配置）

在浏览器控制台：

```js
// 手动发送一个 pageview 事件
posthog.capture('$pageview', {
  $current_url: window.location.href,
  $pathname: window.location.pathname
})
```

然后去 **Activity → Live Events** 查看，应该看到 `$pageview` 事件。

等待 1-2 分钟后，刷新 **Web Analytics** 页面，应该开始有数据了。

---

## 🔄 不想修改代码？使用当前配置

如果你想保持隐私优先配置，不启用 pageview，那么：

### ✅ 使用这些位置查看数据：

1. **Product Analytics → Events**
   - 查看所有自定义事件
   - 创建自定义图表
   - 按时间、类别筛选

2. **Product Analytics → Insights**
   - 创建自定义仪表板
   - 例如：导出次数趋势、最常用功能等

3. **Activity → Live Events**
   - 实时监控用户操作
   - 调试和测试

### 📈 创建自定义仪表板

由于 Web Analytics 不可用，你可以创建自己的仪表板：

#### 示例 Insight 1: 导出趋势

1. **Product Analytics** → **Insights** → **New Insight**
2. **Trends** 图表
3. Event: `export:png` + `export:svg`
4. Time Range: Last 7 days
5. 保存到仪表板

#### 示例 Insight 2: 功能使用排名

1. **New Insight** → **Trends**
2. Event: All events
3. Breakdown by: `category`
4. Visualization: Bar chart
5. 保存到仪表板

---

## 📋 决策指南

### 如果你需要：

| 需求 | 推荐配置 |
|------|---------|
| **只看业务事件** | 保持当前配置 ✅ |
| **页面浏览统计** | 启用 `capture_pageview` |
| **用户路径分析** | 启用 `capture_pageview` |
| **完整用户行为** | 启用 `autocapture` + `capture_pageview` |
| **最大隐私保护** | 保持当前配置 ✅ |

### 我的建议：

**对于你的场景：**
- 如果你主要关心**业务指标**（导出、创建元素等）→ **保持当前配置**
- 如果你想要**完整的 Web Analytics** → **启用 pageview**

当前配置已经能收集到最重要的数据了！只是数据位置在 **Events** 而不是 **Web Analytics**。

---

## ✅ 总结

**当前状态是正常的！**

- ✅ PostHog 正常工作
- ✅ 自定义事件正常发送
- ✅ 数据在 **Activity** 和 **Events** 页面
- ⚠️ **Web Analytics 为空是因为隐私配置**

**如果需要 Web Analytics：**
- 修改 `capture_pageview: true`
- 重启服务器
- 等待 1-2 分钟看到数据

**如果保持当前配置：**
- 使用 **Product Analytics → Events**
- 创建自定义 Insights 和仪表板
- 这样更精准、更隐私友好
