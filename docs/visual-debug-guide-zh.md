# Visual Debug 使用指南

## 概述

Visual Debug 是 Excalidraw Recording 功能的调试模式，用于：

- 控制调试日志的输出
- 显示调试信息面板
- 显示工具栏位置信息（移动端）

## 🔧 如何启用 Visual Debug

### 方法 1: 在浏览器控制台启用（推荐）

1. 打开应用：`http://localhost:3003`
2. 按 `F12` 打开开发者工具
3. 在 Console（控制台）中输入：

```javascript
window.visualDebug = true;
```

4. 刷新页面或触发相关操作

### 方法 2: 在代码中启用（仅开发环境）

在 `excalidraw-app/index.tsx` 或相应的入口文件中添加：

```typescript
// Development only
if (import.meta.env.DEV) {
  window.visualDebug = true;
}
```

### 方法 3: 使用浏览器扩展

使用 Chrome 扩展如 "Window Variable Setter" 设置 `window.visualDebug = true`

## 📊 Visual Debug 启用后会看到什么

### 1. 控制台调试日志

启用后，以下日志会在控制台输出：

#### CanvasSlides 日志

```
[CanvasSlides] scrollX: 0 scrollY: 0 zoom: 1
```

显示画布的滚动位置和缩放级别。

#### RecordingToolbar 日志

**初始化日志：**

```
[RecordingToolbar useEffect] status: pre-recording, zoom from config: 1.5 isMobile: false widthRatio: 0.7 areaW: 800 firstSlide.width: 533.33
```

显示录制区域的计算参数。

**位置计算日志：**

```
[RecordingToolbar] targetSlideX: 100 targetSlideY: 150
[RecordingToolbar] Initializing position: { toolbarWidth: 240, toolbarHeight: 48, windowWidth: 1920, windowHeight: 1080, isMobile: false }
[RecordingToolbar] Calculated position: { initialX: 840, initialY: 1008 }
```

显示工具栏和幻灯片的位置计算过程。

**录制开始日志：**

```
[RecordingToolbar handleBegin] called, slides.length: 3
```

显示录制开始时的幻灯片数量。

### 2. Debug Info 面板

在屏幕左上角显示实时调试信息：

```
━━━━━━━━━━━━━━━━━━━━━━
  Recording Debug Info
━━━━━━━━━━━━━━━━━━━━━━

Toolbar Position: (840, 1008)
Active Slide: 1/3
Slide Position: (100, 150)
Recording Area: 720×1280
Zoom: 1.5x
━━━━━━━━━━━━━━━━━━━━━━
```

**包含信息：**

- 工具栏位置（屏幕坐标）
- 当前激活的幻灯片
- 幻灯片位置（画布坐标）
- 录制区域尺寸
- 当前缩放级别

### 3. 移动端工具栏位置指示器

在移动设备上（屏幕宽度 ≤ 768px），右上角显示：

```
Toolbar: (420, 24)
```

实时显示工具栏的当前位置。

## ❌ 如何禁用 Visual Debug

### 控制台禁用

```javascript
window.visualDebug = false;
```

或

```javascript
delete window.visualDebug;
```

### 刷新页面

刷新页面后 `window.visualDebug` 会被重置为 `undefined`（默认禁用）。

## 🔍 调试场景

### 场景 1: 调试幻灯片位置问题

**问题：** 幻灯片没有出现在正确的位置

**步骤：**

1. 启用 Visual Debug：`window.visualDebug = true`
2. 打开录制功能
3. 查看控制台日志：
   ```
   [RecordingToolbar] targetSlideX: 100 targetSlideY: 150
   ```
4. 在 Debug Info 面板验证 "Slide Position"
5. 检查计算逻辑是否正确

### 场景 2: 调试工具栏拖动问题

**问题：** 工具栏在移动设备上位置不正确

**步骤：**

1. 启用 Visual Debug
2. 调整浏览器窗口大小到移动尺寸（宽度 ≤ 768px）
3. 查看右上角的位置指示器
4. 拖动工具栏，观察坐标变化
5. 检查控制台日志：
   ```
   [RecordingToolbar] Initializing position: { ... isMobile: true }
   ```

### 场景 3: 调试录制区域计算

**问题：** 录制区域尺寸不符合预期

**步骤：**

1. 启用 Visual Debug
2. 选择不同的宽高比（9:16, 16:9 等）
3. 查看控制台日志：
   ```
   [RecordingToolbar useEffect] ... areaW: 800 firstSlide.width: 533.33
   ```
4. 在 Debug Info 面板查看 "Recording Area"
5. 验证计算公式是否正确

### 场景 4: 调试缩放级别

**问题：** 缩放级别不符合预期

**步骤：**

1. 启用 Visual Debug
2. 查看控制台日志：
   ```
   [CanvasSlides] scrollX: 0 scrollY: 0 zoom: 1.5
   ```
3. 在 Debug Info 面板查看 "Zoom"
4. 手动缩放画布，观察日志变化

## 🎯 开发建议

### 何时使用 Visual Debug

✅ **应该使用：**

- 开发新的录制功能
- 调试位置计算问题
- 排查移动端适配问题
- 验证缩放和滚动逻辑
- 进行性能分析

❌ **不应该使用：**

- 生产环境（永远不要在生产环境启用）
- 性能测试（日志会影响性能）
- 用户演示（会显示调试信息）

### 最佳实践

1. **开发时默认禁用**

   - 默认 `window.visualDebug` 为 `undefined`
   - 需要时手动启用
   - 避免提交启用代码到仓库

2. **使用条件日志**

   ```typescript
   if (window.visualDebug) {
     console.log("[Component] Debug info:", data);
   }
   ```

3. **添加有意义的日志标签**

   ```typescript
   // ✅ 好的日志
   console.log("[RecordingToolbar handleBegin] slides.length:", slides.length);

   // ❌ 不好的日志
   console.log("begin", slides.length);
   ```

4. **使用结构化日志**

   ```typescript
   // ✅ 好的日志
   console.log("[Component] State:", {
     width: 800,
     height: 600,
     zoom: 1.5,
   });

   // ❌ 不好的日志
   console.log("[Component]", 800, 600, 1.5);
   ```

## 📝 添加新的调试日志

如果需要添加新的调试日志，请遵循以下模式：

```typescript
// 在组件或函数中
if (window.visualDebug) {
  console.log("[ComponentName] Action description:", {
    relevantData1: value1,
    relevantData2: value2,
  });
}
```

### 日志标签格式

使用 `[ComponentName]` 或 `[ComponentName FunctionName]` 格式：

- `[CanvasSlides]` - 组件名称
- `[RecordingToolbar useEffect]` - 组件名称 + Hook/函数名称
- `[RecordingToolbar handleBegin]` - 组件名称 + 事件处理器名称

### 日志内容指南

**包含：**

- 关键状态变量
- 计算的中间结果
- 用户操作的上下文
- 条件判断的结果

**不包含：**

- 敏感信息（用户数据、API keys）
- 完整的对象树（太大）
- 重复的信息

## 🔒 生产环境

### 确保生产环境不启用

在构建配置中，确保生产环境不包含调试代码：

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    "window.visualDebug": false, // 在生产环境强制禁用
  },
  // ... other config
});
```

### 检查生产构建

```bash
# 构建生产版本
yarn build:app

# 检查是否包含调试代码
grep -r "visualDebug" dist/
```

如果输出为空，说明生产构建正确。

## 🧪 测试

### 测试 Visual Debug 功能

```typescript
describe("Visual Debug", () => {
  it("should not log when visualDebug is false", () => {
    window.visualDebug = false;
    const consoleLogSpy = vi.spyOn(console, "log");

    // Trigger component that uses visual debug logging
    // ...

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("should log when visualDebug is true", () => {
    window.visualDebug = true;
    const consoleLogSpy = vi.spyOn(console, "log");

    // Trigger component that uses visual debug logging
    // ...

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ComponentName]"),
      expect.any(Object),
    );
  });
});
```

## 📊 性能影响

### 启用 Visual Debug 的性能影响

- **控制台日志：** ~0.1-1ms 每次调用
- **Debug Info 面板：** ~1-5ms 每次渲染
- **总体影响：** 在开发环境可接受，在生产环境不可接受

### 优化建议

1. **避免高频日志**

   ```typescript
   // ❌ 不好 - 在 useEffect 依赖数组中的高频变化变量
   useEffect(() => {
     if (window.visualDebug) {
       console.log("[Component]", scrollX, scrollY); // 滚动时频繁触发
     }
   }, [scrollX, scrollY]);

   // ✅ 好 - 使用节流
   useEffect(() => {
     const throttled = throttle(() => {
       if (window.visualDebug) {
         console.log("[Component]", scrollX, scrollY);
       }
     }, 100);

     throttled();
   }, [scrollX, scrollY]);
   ```

2. **条件渲染 Debug 面板**
   ```typescript
   {
     window.visualDebug && showDebugInfo && <DebugPanel />;
   }
   ```

## 🆘 常见问题

### Q: 为什么我看不到日志？

**A:** 确认以下几点：

1. 是否启用了 Visual Debug：`console.log(window.visualDebug)`
2. 是否打开了浏览器控制台
3. 控制台是否过滤了日志级别（应该显示 "Info"）
4. 是否触发了相应的操作（如打开录制功能）

### Q: 如何在生产环境完全禁用？

**A:** 在构建配置中使用 tree-shaking：

```typescript
// vite.config.ts
if (process.env.NODE_ENV === "production") {
  config.define = {
    "window.visualDebug": false,
  };
}
```

### Q: 可以在移动端使用吗？

**A:** 可以，但需要：

1. 使用移动设备的调试工具（如 Chrome Remote Debugging）
2. 或在代码中启用：`window.visualDebug = true`
3. 查看移动端专属的工具栏位置指示器

### Q: 日志太多怎么办？

**A:** 使用浏览器控制台的过滤功能：

1. 在控制台输入框输入 `[RecordingToolbar]` 只显示录制工具栏的日志
2. 或输入 `-[CanvasSlides]` 排除画布幻灯片的日志

## 📖 相关文档

- **Recording 实现计划：** `docs/recording-implementation-plan.md`
- **Recording 实现总结：** `docs/recording-implementation-summary.md`
- **TypeScript 类型定义：** `packages/excalidraw/global.d.ts`

---

**最后更新：** 2026-02-27 **相关文件：**

- `packages/excalidraw/global.d.ts` - 类型定义
- `packages/excalidraw/components/CanvasSlides.tsx` - 画布幻灯片日志
- `packages/excalidraw/components/Recording/RecordingToolbar.tsx` - 录制工具栏日志
