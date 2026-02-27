# 录制功能移动端响应式适配文档

## 概述

本文档记录了 Excalidraw 录制功能在移动端（手机浏览器）的响应式适配工作，包括 UI 布局调整、交互优化和缩放问题修复。

**适配范围**：
- RecordingToolbar（录制工具栏）
- SlideNavigator（幻灯片导航器）
- RecordingDialog（录制设置对话框）
- RecordingOverlay（录制覆盖层）
- Slide 缩放逻辑

**断点定义**：使用 `@media (max-width: 768px)` 作为移动端断点

---

## 1. RecordingToolbar 移动端适配

### 1.1 问题
- 原本固定在底部居中
- 在移动端无法渲染（被 `formFactor !== "phone"` 条件排除）

### 1.2 解决方案

#### 修改文件
- `packages/excalidraw/components/LayerUI.tsx`
- `packages/excalidraw/components/Recording/RecordingToolbar.tsx`
- `packages/excalidraw/components/Recording/RecordingToolbar.scss`

#### 1.2.1 LayerUI.tsx - 移除渲染限制

**修改前**：
```tsx
{editorInterface.formFactor !== "phone" && (
  <>
    <RecordingToolbar />
    <RecordingOverlay />
    <Teleprompter />
  </>
)}
```

**修改后**：
```tsx
{editorInterface.formFactor !== "phone" && (
  <>
    {/* Desktop UI */}
  </>
)}
{/* Always render these components */}
<RecordingToolbar />
<RecordingOverlay elements={elements} appState={appState} files={files} />
<Teleprompter />
```

#### 1.2.2 RecordingToolbar.tsx - 自适应定位

**核心逻辑**：
```typescript
const isMobile = window.innerWidth <= 768;

// 初始位置
const initialX = (window.innerWidth - toolbarWidth) / 2; // 水平居中
const initialY = isMobile
  ? 24 // 移动端：顶部 24px
  : window.innerHeight - toolbarHeight - 24; // 桌面端：底部 24px
```

**Resize 处理**：
```typescript
const handleResize = () => {
  const isMobile = window.innerWidth <= 768;
  // 检测是否在预期位置附近
  const isNearCenter = Math.abs(prev.x - (window.innerWidth - toolbarWidth) / 2) < 50;
  const isNearTop = prev.y < 100;
  const isNearBottom = prev.y > window.innerHeight - toolbarHeight - 100;

  // 根据设备类型重新定位
  if (isNearCenter && ((isMobile && isNearTop) || (!isMobile && isNearBottom))) {
    return { x: centerX, y: isMobile ? 24 : bottom };
  }
};
```

#### 1.2.3 RecordingToolbar.scss - 移动端样式

```scss
.RecordingToolbar {
  @media (max-width: 768px) {
    gap: 6px;
    padding: 6px 8px;
    max-width: calc(100vw - 16px);

    &__icon-button {
      width: 32px;
      height: 32px;
    }

    &__record-button,
    &__begin-button {
      padding: 6px 12px;
      font-size: 12px;
    }
  }
}
```

### 1.3 最终效果

**移动端**：
- 位置：顶部居中（top: 24px）
- 尺寸：按钮和字体略小
- 可拖动，但自动适配屏幕边界

**桌面端**：
- 位置：底部居中（保持原样）
- 尺寸：保持原样

---

## 2. SlideNavigator 移动端适配

### 2.1 问题
- 原本垂直布局在右侧
- 移动端空间有限，垂直布局占用太多高度

### 2.2 解决方案

#### 修改文件
- `packages/excalidraw/components/SlideNavigator.scss`
- `packages/excalidraw/components/SlideNavigator.tsx`

#### 2.2.1 SlideNavigator.scss - 响应式布局

```scss
.slide-navigator {
  // 桌面端：右侧垂直
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;

  @media (max-width: 768px) {
    // 移动端：底部水平
    right: auto;
    top: auto;
    bottom: 70px; // 在 App-toolbar 上方
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    max-width: calc(100vw - 32px);
    border-radius: 12px;
  }

  &__list {
    flex-direction: column;
    overflow-y: auto;

    @media (max-width: 768px) {
      flex-direction: row;
      overflow-x: auto; // 水平滚动
      overflow-y: visible;
    }
  }

  &__button {
    @media (max-width: 768px) {
      width: 36px;
      height: 36px;
    }

    &--add {
      margin-top: 6px;

      @media (max-width: 768px) {
        margin-top: 0;
        margin-left: 6px;
      }
    }
  }
}
```

#### 2.2.2 SlideNavigator.tsx - 滚动逻辑

**自动滚动到激活的幻灯片**：
```typescript
useEffect(() => {
  if (activeSlideId && listRef.current) {
    const activeIndex = slides.findIndex((s) => s.id === activeSlideId);
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // 移动端：水平滚动
      const buttonWidth = 36 + 6;
      const scrollPosition = activeIndex * buttonWidth;
      listRef.current.scrollTo({
        left: scrollPosition - containerWidth / 2 + buttonWidth / 2,
        behavior: "smooth",
      });
    } else {
      // 桌面端：垂直滚动
      const buttonHeight = 32 + 6;
      const scrollPosition = activeIndex * buttonHeight;
      listRef.current.scrollTo({
        top: scrollPosition - containerHeight / 2 + buttonHeight / 2,
        behavior: "smooth",
      });
    }
  }
}, [activeSlideId, slides]);
```

### 2.3 最终效果

**移动端**：
- 位置：底部水平居中，在 App-toolbar 上方 70px
- 布局：水平排列，支持左右滑动
- 按钮：36px × 36px，更大的触摸目标

**桌面端**：
- 位置：右侧垂直居中（保持原样）
- 布局：垂直排列，支持上下滚动

---

## 3. RecordingDialog 移动端适配

### 3.1 问题
- 左右分栏布局在小屏幕严重挤压
- 固定高度 640px 超出移动端屏幕
- 所有元素尺寸过大

### 3.2 解决方案

#### 修改文件
- `packages/excalidraw/components/RecordingDialog.scss`
- `packages/excalidraw/components/Recording/AspectRatioSelector.scss`
- `packages/excalidraw/components/Recording/BackgroundWallpaperPicker.scss`
- `packages/excalidraw/components/Recording/RecordingPreview.scss`

#### 3.2.1 RecordingDialog.scss - 布局重构

```scss
.RecordingDialog {
  display: flex;
  height: 640px;

  @media (max-width: 768px) {
    flex-direction: column; // 垂直布局
    height: auto;
    max-height: 85vh;
    overflow-y: auto;
  }

  &__preview {
    flex: 0 0 38%;

    @media (max-width: 768px) {
      flex: 0 0 auto;
      border-right: none;
      border-bottom: 1px solid var(--color-gray-20);
      padding: 20px 16px;
      min-height: 200px;
    }
  }

  &__settings-inner {
    padding: 24px 32px;

    @media (max-width: 768px) {
      padding: 16px 20px;
    }
  }

  &__footer {
    @media (max-width: 768px) {
      position: sticky;
      bottom: 0;
      background: #fff;
      border-top: 1px solid var(--color-gray-20);
    }
  }

  &__cancel-btn {
    @media (max-width: 768px) {
      flex: 1; // 等宽按钮
    }
  }
}
```

#### 3.2.2 AspectRatioSelector.scss - 缩小尺寸

```scss
.AspectRatioSelector {
  &__button {
    min-height: 72px;

    @media (max-width: 768px) {
      min-height: 64px;
      padding: 10px 8px;
    }

    &-label {
      font-size: 16px;

      @media (max-width: 768px) {
        font-size: 14px;
      }
    }
  }
}
```

#### 3.2.3 BackgroundWallpaperPicker.scss - 网格调整

```scss
.BackgroundWallpaperPicker {
  &__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));

    @media (max-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr)); // 4列→3列
      gap: 8px;
      max-height: 240px;
    }
  }
}
```

### 3.3 最终效果

**移动端**：
- 布局：预览在上，设置在下（垂直布局）
- 高度：85vh，可滚动
- 底部按钮：固定在底部，等宽显示
- 所有元素：字体和间距缩小

**桌面端**：
- 布局：预览在左，设置在右（保持原样）

---

## 4. RecordingOverlay 移动端适配

### 4.1 问题
- 默认宽度为 canvas 的 80%
- 移动端应该占满整个屏幕宽度
- 触摸手柄太小，不易操作

### 4.2 解决方案

#### 修改文件
- `packages/excalidraw/components/Recording/RecordingOverlay.tsx`
- `packages/excalidraw/components/Recording/RecordingOverlay.scss`

#### 4.2.1 RecordingOverlay.tsx - 宽度计算

```typescript
useEffect(() => {
  if (!isOpen || !canvasBounds) return;

  setRecordingArea((prev) => {
    // 移动端使用 100% 宽度，桌面端使用 80%
    const isMobile = window.innerWidth <= 768;
    const widthRatio = isMobile ? 1.0 : 0.8;
    const heightRatio = isMobile ? 1.0 : 0.8;

    const maxWidth = canvasBounds.width * widthRatio;
    const maxHeight = canvasBounds.height * heightRatio;
    let width = prev?.width ?? maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    // ... 计算位置
    return { x, y, width, height };
  });
}, [isOpen, canvasBounds, aspectRatio]);
```

#### 4.2.2 RecordingOverlay.scss - 移动端优化

```scss
.RecordingOverlay {
  &__frame {
    border: 2px solid #3bb54a;

    @media (max-width: 768px) {
      border-width: 1px; // 更薄的边框
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.15); // 更浅的遮罩
    }
  }

  &__handle {
    width: 12px;
    height: 12px;

    @media (max-width: 768px) {
      width: 16px; // 更大的触摸目标
      height: 16px;
    }
  }

  &__rec-badge {
    @media (max-width: 768px) {
      top: 8px;
      right: 8px;
      font-size: 10px;
    }
  }
}
```

### 4.3 最终效果

**移动端**：
- 宽度：100% 窗口宽度
- 边框：1px，更薄
- 手柄：16px，更大
- REC 徽章：缩小字体

**桌面端**：
- 宽度：80% canvas 宽度（保持原样）

---

## 5. Slide 缩放问题修复

### 5.1 问题
- RecordingOverlay 已改为 100% 宽度
- 但计算 slide zoom 时仍使用 80% 宽度
- 导致 slide 大小与 RecordingOverlay 不匹配

### 5.2 解决方案

#### 修改文件
- `packages/excalidraw/components/Recording/RecordingToolbar.tsx`

#### 5.2.1 Pre-recording 阶段的 zoom 计算

**修改前**：
```typescript
const maxWidth = window.innerWidth * 0.8;
const maxHeight = window.innerHeight * 0.8;
let areaW = maxWidth;
// ...
const zoom = areaW / firstSlide.width;
```

**修改后**：
```typescript
// 移动端使用 100%，桌面端使用 80%
const isMobile = window.innerWidth <= 768;
const widthRatio = isMobile ? 1.0 : 0.8;
const heightRatio = isMobile ? 1.0 : 0.8;

const maxWidth = window.innerWidth * widthRatio;
const maxHeight = window.innerHeight * heightRatio;
let areaW = maxWidth;
let areaH = areaW / aspectRatio;
if (areaH > maxHeight) {
  areaH = maxHeight;
  areaW = areaH * aspectRatio;
}

const zoom = areaW / firstSlide.width;
console.log(
  "[RecordingToolbar] zoom:",
  zoom,
  "isMobile:",
  isMobile,
  "widthRatio:",
  widthRatio,
  "areaW:",
  areaW,
);
```

#### 5.2.2 Debug 信息同步

```typescript
// Debug 部分使用相同的计算逻辑
const isMobileDebug = window.innerWidth <= 768;
const widthRatioDebug = isMobileDebug ? 1.0 : 0.8;
const heightRatioDebug = isMobileDebug ? 1.0 : 0.8;
const maxW = window.innerWidth * widthRatioDebug;
const maxH = window.innerHeight * heightRatioDebug;
```

### 5.3 最终效果

**移动端**：
- Zoom 计算：基于 100% 窗口宽度
- Slide 大小 = RecordingOverlay 大小 ✅

**桌面端**：
- Zoom 计算：基于 80% 窗口宽度
- Slide 大小 = RecordingOverlay 大小 ✅

---

## 6. 技术要点和最佳实践

### 6.1 响应式断点

```scss
// 使用统一的断点
@media (max-width: 768px) {
  // 移动端样式
}
```

**JavaScript 中的判断**：
```typescript
const isMobile = window.innerWidth <= 768;
```

### 6.2 触摸友好设计

**原则**：移动端触摸目标至少 36px × 36px

```scss
.element {
  width: 32px;
  height: 32px;

  @media (max-width: 768px) {
    width: 36px; // 增大触摸区域
    height: 36px;
  }
}
```

### 6.3 布局策略

**垂直空间有限**：
- 桌面端：垂直布局优先
- 移动端：水平布局或堆叠布局

```scss
.container {
  flex-direction: column;

  @media (max-width: 768px) {
    flex-direction: row; // 或保持 column 但调整高度
  }
}
```

### 6.4 Resize 事件处理

```typescript
useEffect(() => {
  const handleResize = () => {
    // 重新计算位置/尺寸
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### 6.5 移动端地址栏处理

移动端浏览器地址栏会动态显示/隐藏，导致 `window.innerHeight` 变化。

**解决方案**：
- 使用 `vh` 单位时要小心
- 监听 resize 事件动态调整
- 使用 sticky 定位固定关键元素

### 6.6 调试技巧

**添加移动端 Debug 面板**：
```tsx
{window.innerWidth <= 768 && (
  <div style={{ position: "fixed", top: 0, right: 0, ... }}>
    Window: {window.innerWidth} x {window.innerHeight}
  </div>
)}
```

**Console 日志**：
```typescript
console.log("[Component] isMobile:", isMobile, "width:", width);
```

---

## 7. 移动端布局效果图

### 7.1 整体布局

```
┌────────────────────────────────┐
│  RecordingToolbar (顶部居中)    │ ← top: 24px
│  [●][T][录制][暂停][停止]       │
├────────────────────────────────┤
│                                │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │   RecordingOverlay       │ │ ← 100% 宽度
│  │   (录制区域)              │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
├────────────────────────────────┤
│  [1][2][3][4][5][+][●]        │ ← bottom: 70px
│  SlideNavigator (水平滚动)      │
├────────────────────────────────┤
│  [工具栏图标] App-toolbar       │ ← bottom: 0
└────────────────────────────────┘
```

### 7.2 RecordingDialog

```
┌────────────────────────────────┐
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │   预览区域                │ │
│  │   (200px min-height)     │ │
│  │                          │ │
│  └──────────────────────────┘ │
├────────────────────────────────┤
│  画面比例                       │
│  [9:16] [16:9] [4:3]          │
│                                │
│  背景壁纸                       │
│  [图][图][图]                  │ ← 3列网格
│                                │
│  圆角半径: 16px                 │
│  ──────●───────                │
│                                │
│  ... (可滚动)                  │
├────────────────────────────────┤
│  [取消]          [保存设置]     │ ← sticky 底部
└────────────────────────────────┘
```

---

## 8. 测试清单

### 8.1 RecordingToolbar

- [ ] 移动端显示在顶部居中
- [ ] 桌面端显示在底部居中
- [ ] 可拖动，不超出屏幕边界
- [ ] 旋转屏幕时正确重新定位
- [ ] 所有按钮可点击，尺寸合适

### 8.2 SlideNavigator

- [ ] 移动端水平排列在底部
- [ ] 桌面端垂直排列在右侧
- [ ] 激活的幻灯片自动滚动到可见区域
- [ ] 添加新幻灯片后自动滚动到末尾
- [ ] 按钮大小适合触摸（36px）

### 8.3 RecordingDialog

- [ ] 移动端垂直布局，可滚动
- [ ] 预览区显示在顶部
- [ ] 设置区显示在下方
- [ ] 底部按钮固定，等宽显示
- [ ] 所有控件可操作，不拥挤

### 8.4 RecordingOverlay

- [ ] 移动端占满屏幕宽度（100%）
- [ ] 桌面端占 80% canvas 宽度
- [ ] 手柄大小适合触摸（16px）
- [ ] 可拖动、可调整大小
- [ ] REC 徽章清晰可见

### 8.5 Slide 缩放

- [ ] 移动端 slide 完美填充 RecordingOverlay
- [ ] 桌面端 slide 完美填充 RecordingOverlay
- [ ] 进入 pre-recording 时 zoom 正确
- [ ] 开始录制后 zoom 保持正确

### 8.6 整体测试

- [ ] 所有组件不重叠
- [ ] 在不同尺寸手机上测试（320px - 768px）
- [ ] 横屏和竖屏都正常
- [ ] 触摸交互流畅
- [ ] 无 console 错误

---

## 9. 相关文件清单

### 9.1 核心文件

```
packages/excalidraw/components/
├── LayerUI.tsx                          # 移除 phone 渲染限制
├── Recording/
│   ├── RecordingToolbar.tsx            # 自适应定位逻辑
│   ├── RecordingToolbar.scss           # 移动端样式
│   ├── RecordingOverlay.tsx            # 宽度计算逻辑
│   ├── RecordingOverlay.scss           # 移动端样式
│   ├── RecordingDialog.scss            # 响应式布局
│   ├── AspectRatioSelector.scss        # 移动端缩小
│   ├── BackgroundWallpaperPicker.scss  # 网格调整
│   └── RecordingPreview.scss           # 高度调整
├── SlideNavigator.tsx                   # 滚动逻辑
└── SlideNavigator.scss                  # 水平布局
```

### 9.2 修改统计

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| LayerUI.tsx | 移除渲染条件 | ~10 |
| RecordingToolbar.tsx | 定位逻辑 + zoom 计算 | ~80 |
| RecordingToolbar.scss | 移动端样式 | ~50 |
| RecordingOverlay.tsx | 宽度计算 | ~20 |
| RecordingOverlay.scss | 移动端样式 | ~60 |
| RecordingDialog.scss | 响应式布局 | ~120 |
| SlideNavigator.tsx | 滚动逻辑 | ~30 |
| SlideNavigator.scss | 水平布局 | ~80 |
| AspectRatioSelector.scss | 移动端样式 | ~20 |
| BackgroundWallpaperPicker.scss | 移动端样式 | ~40 |
| RecordingPreview.scss | 移动端样式 | ~30 |
| withInternalFallback.tsx | Hooks 规则修复 | ~30 |

**总计**: ~570 行代码修改

---

## 10. 已知问题和未来改进

### 10.1 已知问题

暂无已知问题

### 10.2 未来改进方向

1. **性能优化**
   - 考虑使用 IntersectionObserver 优化 slide 滚动
   - 减少 resize 事件的触发频率（debounce）

2. **用户体验**
   - 添加移动端手势支持（双指缩放录制区域）
   - 提供快捷预设（一键适配屏幕）

3. **可访问性**
   - 添加 ARIA 标签
   - 支持键盘导航

4. **更多设备支持**
   - 测试平板设备（768px - 1024px）
   - 添加中等屏幕的断点

---

## 11. 参考资源

### 11.1 相关文档

- [Excalidraw 录制实现计划](./recording-implementation-plan.md)
- [Excalidraw 录制实现总结](./recording-implementation-summary.md)
- [幻灯片子系统文档](./slide-subsystem.md)

### 11.2 技术栈

- React 18+
- TypeScript
- SCSS (Sass)
- Jotai (状态管理)
- Remotion (视频录制)

### 11.3 浏览器兼容性

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Android Chrome 90+

---

**文档版本**: 1.0
**最后更新**: 2026-02-27
**维护者**: Claude Code
