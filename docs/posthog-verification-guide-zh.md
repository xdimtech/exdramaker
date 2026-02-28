# PostHog 验证指南

本指南帮助你验证 PostHog 分析是否正常工作。

## 🔍 快速检查（5 分钟）

### 步骤 1: 启动开发服务器

```bash
yarn start
```

等待服务器启动，通常在 `http://localhost:3003`

### 步骤 2: 打开浏览器开发者工具

1. 在浏览器中打开应用
2. 按 `F12` 或 `Cmd+Option+I` (Mac) 打开开发者工具
3. 切换到 **Console（控制台）** 标签

### 步骤 3: 查看初始化日志

在控制台中你应该看到：

```
[Analytics] Registered provider: Simple Analytics
[Analytics] Registered provider: PostHog
```

✅ 如果看到这两行，说明 PostHog 已成功注册！

### 步骤 4: 检查 PostHog 对象

在控制台输入以下命令：

```javascript
window.posthog;
```

**预期结果：**

- 应该返回一个对象（不是 `undefined`）
- 对象包含 `capture`、`init` 等方法

✅ 如果返回了对象，说明 PostHog 脚本已加载！

### 步骤 5: 触发一个测试事件

在应用中执行以下任一操作：

1. **导出图片**

   - 点击左上角菜单 → Export image → PNG
   - 或使用快捷键

2. **打开命令面板**

   - 按 `Cmd+K` (Mac) 或 `Ctrl+K` (Windows/Linux)

3. **手动触发事件（在控制台）**
   ```javascript
   // 导入 trackEvent 函数（如果在控制台）
   // 或直接调用 PostHog
   window.posthog.capture("test:manual", {
     category: "test",
     action: "manual",
     label: "console_test",
   });
   ```

### 步骤 6: 查看事件日志

由于 `VITE_APP_POSTHOG_DEBUG=true`，在控制台你应该看到：

```
[Analytics] PostHog: {
  category: 'export',
  action: 'png',
  label: 'canvas',
  value: 1
}
```

✅ 如果看到这个日志，说明事件已发送！

### 步骤 7: 检查网络请求

1. 在开发者工具切换到 **Network（网络）** 标签
2. 刷新页面或触发一个事件
3. 在过滤器中输入 `posthog` 或 `capture`

**查找以下请求：**

- URL: `https://us.i.posthog.com/decide/` - PostHog 初始化
- URL: `https://us.i.posthog.com/e/` 或 `/capture/` - 事件发送

**请求状态应该是 200 或 202**

✅ 如果看到这些请求且状态码正常，说明数据已发送到 PostHog！

### 步骤 8: 在 PostHog 仪表板验证

1. 访问 PostHog 仪表板：https://us.i.posthog.com
2. 登录你的账户
3. 选择对应的项目
4. 导航到 **Events（事件）** 页面
5. 设置时间范围为 "Last 5 minutes（最近 5 分钟）"

**你应该看到：**

- 事件名称格式：`category:action`（例如：`export:png`、`test:manual`）
- 事件属性包含：
  - `category`
  - `action`
  - `label` (如果有)
  - `app_version`
  - `environment`: "development"

✅ 如果在仪表板看到事件，说明 PostHog 完全正常工作！

---

## 🐛 常见问题排查

### 问题 1: 控制台没有看到 `[Analytics] Registered provider` 日志

**可能原因：**

- PostHog 脚本加载失败
- 环境变量配置错误

**解决方法：**

1. 检查 `VITE_APP_POSTHOG_ENABLED` 是否为 `true`：

   ```bash
   cat .env.development | grep POSTHOG_ENABLED
   ```

2. 检查浏览器控制台是否有 JavaScript 错误

3. 确保你重启了开发服务器（修改 `.env` 文件后需要重启）

### 问题 2: `window.posthog` 是 `undefined`

**可能原因：**

- PostHog 脚本未加载
- API key 无效
- 网络问题（被防火墙或广告拦截器阻止）

**解决方法：**

1. 检查网络标签，查看是否有请求失败

2. 检查是否有广告拦截器（uBlock、AdBlock 等）阻止了 PostHog：

   - 临时禁用广告拦截器
   - 或将 `localhost` 加入白名单

3. 检查 PostHog API key 是否正确：

   ```bash
   cat .env.development | grep POSTHOG_KEY
   ```

4. 在 PostHog 仪表板验证 API key：
   - 设置 → Project → Project API Key

### 问题 3: 事件没有出现在 PostHog 仪表板

**可能原因：**

- 事件类别未在允许列表中
- 开发环境被 `isDevEnv()` 禁用
- 时间延迟（PostHog 可能有 1-2 分钟延迟）

**解决方法：**

1. **检查事件类别是否在允许列表中：**

   ```bash
   cat packages/excalidraw/analytics.ts | grep -A 8 "ALLOWED_CATEGORIES_TO_TRACK"
   ```

   当前允许的类别：

   - `command_palette`
   - `export`
   - `element`
   - `clipboard`
   - `selection`
   - `share`
   - `feature`
   - `app`

2. **临时禁用 isDevEnv 检查（仅用于测试）：**

   编辑 `packages/excalidraw/analytics.ts`，注释掉第 60-62 行：

   ```typescript
   // if (isDevEnv()) {
   //   return;
   // }
   ```

   ⚠️ **记得测试后恢复这些行！**

3. **等待 1-2 分钟**，PostHog 可能有轻微延迟

4. **检查 PostHog 项目是否正确**：
   - 确认你登录的是正确的 PostHog 项目
   - API key 对应的项目

### 问题 4: 控制台显示 CORS 错误

**错误信息：**

```
Access to fetch at 'https://us.i.posthog.com/...' from origin 'http://localhost:3003'
has been blocked by CORS policy
```

**解决方法：**

这通常不是真正的 CORS 问题，而是：

1. **PostHog host 配置错误**：

   ```bash
   # 检查配置
   cat .env.development | grep POSTHOG_HOST

   # 应该是以下之一：
   # https://app.posthog.com (欧盟/美国共享实例)
   # https://us.i.posthog.com (美国专用实例)
   # https://eu.i.posthog.com (欧盟专用实例)
   ```

2. **检查你的 PostHog 实例地址**：
   - 登录 PostHog
   - 查看浏览器地址栏的域名
   - 确保 `VITE_APP_POSTHOG_HOST` 匹配该域名

### 问题 5: 事件在控制台显示但未发送到 PostHog

**可能原因：**

- `VITE_APP_ENABLE_TRACKING` 被设置为 `false`
- PostHog 被浏览器扩展阻止

**解决方法：**

1. **检查主开关：**

   ```bash
   cat .env.development | grep VITE_APP_ENABLE_TRACKING
   ```

   应该是 `VITE_APP_ENABLE_TRACKING=true`

2. **禁用浏览器隐私扩展（临时）：**

   - Privacy Badger
   - Ghostery
   - uBlock Origin
   - AdBlock Plus

   测试完成后可以重新启用

3. **检查浏览器的 Do Not Track 设置：**
   - Chrome: Settings → Privacy and security → Send a "Do Not Track" request
   - 临时关闭该选项进行测试

---

## ✅ 验证清单

完成以下检查以确保 PostHog 正常工作：

- [ ] 开发服务器成功启动
- [ ] 控制台显示 "Registered provider: PostHog"
- [ ] `window.posthog` 不是 `undefined`
- [ ] 触发事件后控制台显示 `[Analytics] PostHog:` 日志
- [ ] Network 标签显示发送到 PostHog 的请求（状态码 200/202）
- [ ] PostHog 仪表板在 5 分钟内显示事件
- [ ] 事件属性包含 `category`、`action`、`app_version`
- [ ] 没有 JavaScript 错误
- [ ] 没有 PII（个人身份信息）在事件属性中

如果所有项都打勾 ✅，PostHog 完全正常工作！

---

## 🎯 高级调试

### 启用详细日志

PostHog 已配置为在开发环境启用调试模式（`VITE_APP_POSTHOG_DEBUG=true`）。

查看更多日志：

```javascript
// 在浏览器控制台
window.posthog.debug(true);
```

### 查看 PostHog 配置

```javascript
// 在浏览器控制台
window.posthog.get_config();
```

预期输出应包含：

```javascript
{
  api_host: "https://us.i.posthog.com",
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: false,
  respect_dnt: true,
  // ... 其他配置
}
```

### 手动发送测试事件

```javascript
// 在浏览器控制台
window.posthog.capture("test_event", {
  test_property: "test_value",
  timestamp: new Date().toISOString(),
});

console.log("测试事件已发送！");
```

然后在 PostHog 仪表板查看 `test_event` 事件。

### 检查事件队列

```javascript
// 查看待发送的事件
window.posthog._get_config("_send_request");
```

---

## 📊 生产环境验证

生产环境的验证步骤类似，但注意：

1. **不会有控制台日志**（`VITE_APP_POSTHOG_DEBUG=false`）
2. **使用生产环境的 API key**
3. **在 PostHog 仪表板选择生产项目**

验证方法：

- 查看 Network 标签的 PostHog 请求
- 在 PostHog 仪表板查看实时事件（Live Events）
- 检查事件量是否符合预期（应该 > 1000 事件/天）

---

## 💡 提示

1. **清除浏览器缓存**：如果更新了配置，清除缓存并硬刷新（Cmd+Shift+R / Ctrl+Shift+R）

2. **隐身模式测试**：在隐身/无痕模式下测试，避免浏览器扩展干扰

3. **多个浏览器测试**：在不同浏览器（Chrome、Firefox、Safari）测试

4. **检查 PostHog 状态**：https://status.posthog.com 查看 PostHog 服务是否正常

5. **时区注意**：PostHog 仪表板默认使用 UTC 时间，注意调整时区

---

## 📞 获取帮助

如果问题仍未解决：

1. 查看完整文档：`docs/posthog-analytics-integration.md`
2. 检查 PostHog 官方文档：https://posthog.com/docs/libraries/js
3. PostHog 社区：https://posthog.com/questions
4. 提交 Issue 并附上：
   - 浏览器控制台截图
   - Network 标签截图
   - 环境变量配置（隐藏 API key）
   - 错误信息

---

**最后更新：** 2026-02-27
