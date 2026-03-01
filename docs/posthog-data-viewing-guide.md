# PostHog 数据查看指南

## ✅ 好消息：PostHog 已经在工作！

如果你能看到 **Web Vitals** 数据，说明 PostHog 已成功初始化并发送数据。

---

## 📊 在哪里查看数据？

### ❌ 不要看这里：Web Analytics

**Web Analytics** 页面需要 **pageview** 事件，但我们的配置是：

```ts
capture_pageview: false; // 禁用了自动页面浏览追踪
```

所以 Web Analytics 页面会是空的（除了 Web Vitals）。

---

### ✅ 正确的位置：Events 页面

#### 方法 1: 查看所有事件

1. 登录 [PostHog Dashboard](https://app.posthog.com)
2. 导航到 **Product Analytics** → **Events**
3. 应该能看到事件列表，格式为 `category:action`

**示例事件：**

- `export:png`
- `export:svg`
- `element:create`
- `clipboard:copy`
- `feature:ai_used`

#### 方法 2: 实时事件流

1. 导航到 **Activity** → **Live Events**
2. 实时查看事件流（延迟 1-2 秒）
3. 执行一些操作，立即看到事件

#### 方法 3: 数据浏览器

1. 导航到 **Product Analytics** → **Data Management** → **Events**
2. 查看所有已收集的事件类型
3. 点击具体事件查看详情

---

## 🕐 时区问题修复

### 问题：PostHog 显示美国时间

**原因：** PostHog 默认使用 UTC 或项目设置的时区。

### 解决方案 A: 更改项目时区

1. 进入 **Settings** → **Project** → **Project Settings**
2. 找到 **Timezone** 设置
3. 选择你的时区（如 `Asia/Shanghai` 或 `Asia/Hong_Kong`）
4. 保存

**可用时区：**

- `Asia/Shanghai` - 中国标准时间 (UTC+8)
- `Asia/Hong_Kong` - 香港时间 (UTC+8)
- `Asia/Taipei` - 台湾时间 (UTC+8)
- `Asia/Tokyo` - 日本时间 (UTC+9)

### 解决方案 B: 在图表中临时调整

1. 在任何图表右上角，点击设置图标
2. 选择 **Timezone**
3. 选择你的本地时区
4. 应用（仅影响当前图表）

---

## 🧪 测试：发送事件并验证

### 步骤 1: 构建生产版本

```bash
# 确保 VITE_APP_ENABLE_TRACKING=true
yarn build
yarn start:production
```

### 步骤 2: 执行操作

在应用中执行以下操作：

1. **导出画布** → 生成 `export:png` 或 `export:svg` 事件
2. **创建元素** → 生成 `element:create` 事件
3. **复制/粘贴** → 生成 `clipboard:copy` 或 `clipboard:paste` 事件
4. **打开命令面板** (Ctrl+K) → 生成 `command_palette:open` 事件

### 步骤 3: 在 PostHog 中查看

1. 打开 **Activity** → **Live Events**
2. 应该实时看到上面的事件（延迟 1-2 秒）
3. 点击事件查看详细属性

**事件属性示例：**

```json
{
  "category": "export",
  "action": "png",
  "label": "toolbar",
  "value": 1,
  "app_version": "1.0.0",
  "environment": "production",
  "$browser": "Chrome",
  "$os": "Mac OS X",
  "$device_type": "Desktop"
}
```

---

## 📈 创建自定义仪表板

由于我们禁用了 Web Analytics，你可以创建自定义仪表板：

### 步骤 1: 创建 Insight

1. 导航到 **Product Analytics** → **Insights** → **New Insight**
2. 选择 **Trends**

### 步骤 2: 配置图表

**示例 1: 导出趋势**

- Event: `export:png` + `export:svg`
- Breakdown: `action`
- Time Range: Last 7 days

**示例 2: 最常用功能**

- Event: All events
- Breakdown: `category`
- Visualization: Bar chart

**示例 3: 每日活跃操作**

- Event: All events
- Aggregation: Unique users (if you track user IDs)
- Time Range: Last 30 days

### 步骤 3: 保存到仪表板

1. 点击 **Save**
2. 创建新仪表板或添加到现有仪表板
3. 重复创建多个 Insights

---

## 🔍 验证当前数据

### 在浏览器控制台运行：

```js
// 1. 检查 Web Vitals 是否已发送
posthog._queued_events;

// 2. 手动发送测试事件
posthog.capture("manual_test", {
  source: "console",
  timestamp: new Date().toISOString(),
});

// 3. 查看 PostHog 配置
posthog.get_config();
```

### 使用测试工具（如果已启动开发服务器）：

```js
// 检查状态
window.posthogTest.checkStatus();

// 发送测试事件
window.posthogTest.sendTest();

// 模拟用户操作
window.posthogTest.simulateUserEvents();
```

---

## 📊 为什么 Web Analytics 是空的？

### 原因

**Web Analytics** 需要以下事件才能工作：

1. **Pageviews** (`$pageview`) - 我们禁用了 ❌
2. **Autocapture** (`$autocapture`) - 我们禁用了 ❌
3. **Web Vitals** - 这个启用了 ✅（所以你能看到数据）

### 我们的隐私优先配置：

```ts
autocapture: false,         // ❌ 不自动捕获点击
capture_pageview: false,    // ❌ 不自动捕获页面浏览
disable_session_recording: true,  // ❌ 不录制会话
```

**结果：**

- ✅ 隐私友好：只追踪明确定义的事件
- ✅ 数据精准：只有业务相关的事件
- ❌ Web Analytics 页面大部分为空

---

## 🎯 启用 Web Analytics（可选）

如果你确实需要 Web Analytics 数据，可以启用 pageview：

### 修改 `excalidraw-app/index.tsx`：

```ts
const posthogOptions = {
  api_host: import.meta.env.VITE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2026-01-30" as const,
  disable_session_recording: true, // 保持禁用
  autocapture: false, // 保持禁用
  capture_pageview: true, // ✅ 改为 true
  respect_dnt: true,
  secure_cookie: true,
  persistence: "localStorage" as const,
};
```

**重新构建：**

```bash
yarn build:packages
yarn build
```

**优点：**

- ✅ Web Analytics 页面有数据
- ✅ 页面浏览统计
- ✅ 路径分析

**缺点：**

- ⚠️ 收集更多数据（但仍然隐私友好）

---

## 📋 总结

### 当前状态

| 项目           | 状态  | 位置                        |
| -------------- | ----- | --------------------------- |
| **Web Vitals** | ✅ 有 | Web Analytics → Performance |
| **自定义事件** | ✅ 有 | Product Analytics → Events  |
| **页面浏览**   | ❌ 无 | 已禁用（隐私设置）          |
| **用户路径**   | ❌ 无 | 需要 pageview               |
| **实时事件**   | ✅ 有 | Activity → Live Events      |

### 推荐查看位置

1. **日常监控：** Activity → Live Events
2. **数据分析：** Product Analytics → Events
3. **性能监控：** Web Analytics → Performance (Web Vitals)
4. **自定义报表：** Product Analytics → Insights (创建仪表板)

### 时区设置

- 进入 Settings → Project → Timezone
- 选择 `Asia/Shanghai` 或你的本地时区
- 刷新页面查看更新的时间

---

## ❓ 常见问题

### Q1: 为什么 Events 页面也是空的？

**可能原因：**

1. 没有在生产环境运行（`import.meta.env.PROD = false`）
2. 环境变量未设置正确
3. 还没有执行任何操作触发事件

**解决：**

```bash
# 确认环境变量
cat .env.production | grep TRACKING

# 应该显示：
VITE_APP_ENABLE_TRACKING=true
```

### Q2: Live Events 中看到事件，但 Events 页面没有？

**原因：** 数据同步延迟（1-5 分钟）

**解决：** 等待几分钟，刷新页面

### Q3: 时区改了还是显示美国时间？

**解决：**

1. 清除浏览器缓存
2. 退出登录 PostHog
3. 重新登录
4. 验证 Settings → Project → Timezone 已保存

---

## 🎉 成功验证

如果你能看到：

1. ✅ **Web Vitals 数据** - PostHog 正常工作
2. ✅ **Live Events 实时事件** - 事件正在发送
3. ✅ **Events 页面有历史记录** - 数据持久化成功

**恭喜！PostHog 集成完全正常！** 🚀

只是数据位置在 **Events** 而不是 **Web Analytics**。
