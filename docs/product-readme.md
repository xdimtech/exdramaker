# Excalidraw 产品说明书

## 产品概述

Excalidraw 是一个**开源的虚拟手绘风格白板应用**，支持实时协作和端到端加密。它提供了一个简洁直观的界面，让用户能够快速创建手绘风格的图表、流程图、架构图等。

## 核心功能

| 功能             | 描述                                       |
| ---------------- | ------------------------------------------ |
| 🎨 **无限画布**  | 基于 Canvas 的无限白板，支持无限缩放和平移 |
| ✍️ **手绘风格**  | 使用 rough.js 渲染独特的手绘效果           |
| 🌓 **深色模式**  | 支持明暗主题切换                           |
| 📷 **图片支持**  | 可嵌入和编辑图片                           |
| 😀 **形状库**    | 可复用的形状组件库，支持导入导出           |
| 🌐 **国际化**    | 多语言支持 (i18n)                          |
| 📤 **导出**      | 支持 PNG、SVG、剪贴板导出                  |
| 💾 **开放格式**  | 使用 `.excalidraw` JSON 格式存储           |
| ➡️ **箭头绑定**  | 智能箭头连接和标签支持                     |
| 🔙 **撤销/重做** | 完整的历史记录功能                         |
| 🔍 **缩放平移**  | 灵活的视图控制                             |

## 绘图工具

### 基础形状

- **矩形** (Rectangle)
- **菱形** (Diamond)
- **椭圆** (Ellipse)

### 线条工具

- **箭头** (Arrow) - 支持多种箭头样式
- **直线** (Line)
- **自由绘制** (Freedraw)

### 其他工具

- **选择工具** (Selection)
- **套索选择** (Lasso)
- **文本** (Text)
- **图片** (Image)
- **橡皮擦** (Eraser)
- **激光笔** (Laser)
- **框架** (Frame)
- **嵌入内容** (Embeddable)

## 元素属性

每个元素支持以下属性配置：

| 属性     | 说明                                   |
| -------- | -------------------------------------- |
| 描边颜色 | strokeColor                            |
| 背景颜色 | backgroundColor                        |
| 填充样式 | hachure / cross-hatch / solid / zigzag |
| 描边宽度 | strokeWidth                            |
| 描边样式 | solid / dashed / dotted                |
| 圆角     | roundness                              |
| 粗糙度   | roughness (手绘风格强度)               |
| 透明度   | opacity                                |
| 角度     | angle (旋转)                           |
| 锁定     | locked                                 |
| 分组     | groupIds                               |
| 链接     | link                                   |

## Web 应用特有功能

excalidraw.com 提供的额外功能：

| 功能              | 描述                           |
| ----------------- | ------------------------------ |
| 📡 **PWA 支持**   | 可安装为桌面应用，支持离线工作 |
| 🤼 **实时协作**   | WebSocket 实现的多人实时协作   |
| 🔒 **端到端加密** | 协作数据端到端加密，保护隐私   |
| 💾 **本地优先**   | 自动保存到浏览器 IndexedDB     |
| 🔗 **分享链接**   | 生成只读分享链接               |

## 文件格式

### .excalidraw 格式

标准的 JSON 格式，包含：

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null
  },
  "files": {}
}
```

### 导出格式

- **PNG** - 位图导出，支持透明背景
- **SVG** - 矢量图导出，可编辑
- **JSON** - 原始数据导出
- **剪贴板** - 直接复制到剪贴板

## 快捷键

| 快捷键              | 功能         |
| ------------------- | ------------ |
| `V`                 | 选择工具     |
| `R`                 | 矩形         |
| `D`                 | 菱形         |
| `O`                 | 椭圆         |
| `A`                 | 箭头         |
| `L`                 | 直线         |
| `P`                 | 自由绘制     |
| `T`                 | 文本         |
| `E`                 | 橡皮擦       |
| `Ctrl+Z`            | 撤销         |
| `Ctrl+Shift+Z`      | 重做         |
| `Ctrl+D`            | 复制元素     |
| `Ctrl+G`            | 分组         |
| `Ctrl+Shift+G`      | 取消分组     |
| `Delete`            | 删除选中元素 |
| `Ctrl+A`            | 全选         |
| `Ctrl++` / `Ctrl+-` | 缩放         |
| `Ctrl+0`            | 重置缩放     |

## 系统要求

### 浏览器支持

- Chrome 70+
- Firefox (最新版)
- Safari 12+
- Edge 79+

### 不支持

- Internet Explorer
- Opera Mini
- KaiOS 2.5 及以下

## 集成方式

Excalidraw 提供 npm 包供第三方集成：

```bash
npm install @excalidraw/excalidraw
```

支持的框架：

- React 17.x / 18.x / 19.x
- Next.js (需要客户端渲染)
- 任何支持 React 的框架

## 使用场景

1. **架构图设计** - 系统架构、网络拓扑
2. **流程图** - 业务流程、工作流
3. **头脑风暴** - 思维导图、创意收集
4. **线框图** - UI/UX 原型设计
5. **教学演示** - 实时讲解、远程教学
6. **团队协作** - 多人实时编辑

## 已集成 Excalidraw 的产品

- Google Cloud
- Meta
- CodeSandbox
- Obsidian (插件)
- Replit
- Slite
- Notion
- HackerRank
