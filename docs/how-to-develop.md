# Excalidraw 二次开发指南

## 目录

1. [快速开始](#1-快速开始)
2. [基础集成](#2-基础集成)
3. [Props 配置](#3-props-配置)
4. [API 接口](#4-api-接口)
5. [导出功能](#5-导出功能)
6. [元素操作](#6-元素操作)
7. [自定义 UI](#7-自定义-ui)
8. [协作集成](#8-协作集成)
9. [数据持久化](#9-数据持久化)
10. [框架集成](#10-框架集成)
11. [源码开发](#11-源码开发)
12. [类型系统](#12-类型系统)

---

## 1. 快速开始

### 安装

```bash
npm install react react-dom @excalidraw/excalidraw
# 或
yarn add react react-dom @excalidraw/excalidraw
```

### 最小示例

```tsx
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw />
    </div>
  );
}

export default App;
```

> **重要**: 必须为容器设置明确的宽高，Excalidraw 会填满父容器。

---

## 2. 基础集成

### 获取 API 引用

```tsx
import { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  return <Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />;
}
```

### 初始化数据

```tsx
<Excalidraw
  initialData={{
    elements: [
      {
        type: "rectangle",
        id: "rect-1",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        strokeColor: "#000000",
        backgroundColor: "#fab005",
        fillStyle: "solid",
        // ... 其他必要属性
      },
    ],
    appState: {
      viewBackgroundColor: "#f5f5f5",
      zenModeEnabled: false,
    },
    files: {},
  }}
/>
```

### 异步加载初始数据

```tsx
<Excalidraw
  initialData={fetch("/api/drawing")
    .then((res) => res.json())
    .then((data) => ({
      elements: data.elements,
      appState: data.appState,
      files: data.files,
    }))}
/>
```

---

## 3. Props 配置

### 完整 Props 列表

```tsx
interface ExcalidrawProps {
  // 核心
  excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void;
  initialData?:
    | ExcalidrawInitialDataState
    | Promise<ExcalidrawInitialDataState>;

  // 回调
  onChange?: (
    elements: ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
  onPointerUpdate?: (payload: {
    pointer: { x: number; y: number };
    button: "up" | "down";
  }) => void;
  onPointerDown?: (
    activeTool: AppState["activeTool"],
    pointerDownState: PointerDownState,
  ) => void;
  onPointerUp?: (
    activeTool: AppState["activeTool"],
    pointerDownState: PointerDownState,
  ) => void;
  onScrollChange?: (scrollX: number, scrollY: number, zoom: Zoom) => void;
  onPaste?: (data: ClipboardData, event: ClipboardEvent | null) => boolean;
  onLibraryChange?: (items: LibraryItems) => void;
  onLinkOpen?: (element: ExcalidrawElement, event: CustomEvent) => void;
  onDuplicate?: (elements: ExcalidrawElement[], appState: AppState) => void;

  // 模式
  viewModeEnabled?: boolean; // 只读模式
  zenModeEnabled?: boolean; // 禅模式（隐藏UI）
  gridModeEnabled?: boolean; // 显示网格

  // 外观
  theme?: "light" | "dark";
  langCode?: string; // 语言代码
  name?: string; // 画布名称

  // 协作
  isCollaborating?: boolean;

  // 功能开关
  detectScroll?: boolean;
  handleKeyboardGlobally?: boolean;
  autoFocus?: boolean;
  aiEnabled?: boolean;
  showDeprecatedFonts?: boolean;
  renderScrollbars?: boolean;

  // UI 配置
  UIOptions?: UIOptions;
  renderTopLeftUI?: () => JSX.Element;
  renderTopRightUI?: () => JSX.Element;
  renderCustomStats?: () => JSX.Element;

  // 高级
  generateIdForFile?: (file: File) => string | Promise<string>;
  validateEmbeddable?: (url: string) => boolean | "embed" | "link";
  renderEmbeddable?: (element: ExcalidrawEmbeddableElement) => JSX.Element;

  // 子组件
  children?: React.ReactNode;
}
```

### UIOptions 配置

```tsx
<Excalidraw
  UIOptions={{
    canvasActions: {
      changeViewBackgroundColor: true,
      clearCanvas: true,
      export: {
        saveFileToDisk: true,
      },
      loadScene: true,
      saveAsImage: true,
      toggleTheme: true,
    },
    tools: {
      image: true,
    },
  }}
/>
```

---

## 4. API 接口

### ExcalidrawImperativeAPI

```tsx
interface ExcalidrawImperativeAPI {
  // 场景操作
  updateScene(sceneData: SceneData): void;
  resetScene(): void;

  // 获取数据
  getSceneElements(): ExcalidrawElement[];
  getAppState(): AppState;
  getFiles(): BinaryFiles;

  // 文件操作
  addFiles(files: BinaryFileData[]): void;

  // 视图控制
  scrollToContent(target?: ExcalidrawElement | ExcalidrawElement[]): void;
  setScrollToContent(target: ExcalidrawElement | ExcalidrawElement[]): void;

  // 工具
  setActiveTool(
    tool: { type: ToolType } | { type: "custom"; customType: string },
  ): void;

  // 导出
  exportToCanvas(opts: ExportOpts): Promise<HTMLCanvasElement>;
  exportToSvg(opts: ExportOpts): Promise<SVGSVGElement>;
  exportToBlob(opts: ExportOpts): Promise<Blob>;
  exportToClipboard(opts: ExportOpts): Promise<void>;

  // 历史
  history: {
    clear(): void;
  };

  // 状态
  ready: boolean;
  readyPromise: Promise<void>;

  // 获取容器
  getSceneElementsIncludingDeleted(): ExcalidrawElement[];
  refresh(): void;
  setToast(
    toast: { message: string; closable?: boolean; duration?: number } | null,
  ): void;
  id: string;
}
```

### 使用示例

```tsx
// 更新场景
excalidrawAPI.updateScene({
  elements: newElements,
  appState: {
    viewBackgroundColor: "#ffffff",
  },
});

// 切换工具
excalidrawAPI.setActiveTool({ type: "rectangle" });

// 添加图片
excalidrawAPI.addFiles([
  {
    id: "image-1",
    dataURL: "data:image/png;base64,...",
    mimeType: "image/png",
    created: Date.now(),
  },
]);

// 滚动到内容
excalidrawAPI.scrollToContent();
```

---

## 5. 导出功能

### 导入导出函数

```tsx
import {
  exportToCanvas,
  exportToSvg,
  exportToBlob,
  exportToClipboard,
  serializeAsJSON,
  loadFromBlob,
  loadSceneOrLibraryFromBlob,
} from "@excalidraw/excalidraw";
```

### 导出为 Canvas

```tsx
const canvas = await exportToCanvas({
  elements: excalidrawAPI.getSceneElements(),
  appState: {
    ...excalidrawAPI.getAppState(),
    exportWithDarkMode: false,
    exportBackground: true,
  },
  files: excalidrawAPI.getFiles(),
});

// 转为图片 URL
const imageUrl = canvas.toDataURL("image/png");
```

### 导出为 SVG

```tsx
const svg = await exportToSvg({
  elements: excalidrawAPI.getSceneElements(),
  appState: excalidrawAPI.getAppState(),
  files: excalidrawAPI.getFiles(),
});

// 获取 SVG 字符串
const svgString = svg.outerHTML;
```

### 导出为 Blob（下载）

```tsx
const blob = await exportToBlob({
  elements: excalidrawAPI.getSceneElements(),
  appState: excalidrawAPI.getAppState(),
  files: excalidrawAPI.getFiles(),
  mimeType: "image/png",
  quality: 1,
});

// 下载文件
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "drawing.png";
a.click();
URL.revokeObjectURL(url);
```

### 导出到剪贴板

```tsx
await exportToClipboard({
  elements: excalidrawAPI.getSceneElements(),
  appState: excalidrawAPI.getAppState(),
  files: excalidrawAPI.getFiles(),
  type: "png", // "png" | "svg" | "json"
});
```

---

## 6. 元素操作

### 使用 convertToExcalidrawElements

```tsx
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

// 从简化格式创建完整元素
const elements = convertToExcalidrawElements([
  {
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    backgroundColor: "#fab005",
    strokeColor: "#000000",
  },
  {
    type: "ellipse",
    x: 400,
    y: 100,
    width: 150,
    height: 150,
    backgroundColor: "#228be6",
  },
  {
    type: "text",
    x: 100,
    y: 250,
    text: "Hello Excalidraw!",
    fontSize: 24,
  },
  {
    type: "arrow",
    x: 300,
    y: 150,
    width: 100,
    height: 0,
    startBinding: null,
    endBinding: null,
  },
]);

excalidrawAPI.updateScene({ elements });
```

### 元素类型

```typescript
type ExcalidrawElementType =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "image"
  | "frame"
  | "magicframe"
  | "embeddable"
  | "iframe";
```

### 操作已有元素

```tsx
import { mutateElement, newElementWith } from "@excalidraw/excalidraw";

// 不可变更新（推荐）
const updatedElement = newElementWith(originalElement, {
  backgroundColor: "#ff0000",
});

// 可变更新（性能敏感场景）
mutateElement(element, {
  x: element.x + 10,
  y: element.y + 10,
});
```

---

## 7. 自定义 UI

### MainMenu 自定义

```tsx
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";

<Excalidraw>
  <MainMenu>
    {/* 使用默认项 */}
    <MainMenu.DefaultItems.LoadScene />
    <MainMenu.DefaultItems.Export />
    <MainMenu.DefaultItems.SaveAsImage />
    <MainMenu.DefaultItems.ClearCanvas />

    <MainMenu.Separator />

    {/* 自定义项 */}
    <MainMenu.Item onSelect={() => alert("Custom action!")}>
      自定义操作
    </MainMenu.Item>

    <MainMenu.ItemLink href="https://example.com">外部链接</MainMenu.ItemLink>

    {/* 带子菜单的分组 */}
    <MainMenu.Group title="更多选项">
      <MainMenu.Item onSelect={() => {}}>选项 1</MainMenu.Item>
      <MainMenu.Item onSelect={() => {}}>选项 2</MainMenu.Item>
    </MainMenu.Group>
  </MainMenu>
</Excalidraw>;
```

#### 隐藏默认菜单项

通过环境变量可以隐藏侧边栏菜单中的特定选项：

| 环境变量                       | 说明                  | 默认值 |
| ------------------------------ | --------------------- | ------ |
| `VITE_SHOW_LIVE_COLLABORATION` | 隐藏实时协作入口      | `true` |
| `VITE_SHOW_EXCALIDRAW_PLUS`    | 隐藏 Excalidraw+ 链接 | `true` |
| `VITE_SHOW_DISCORD`            | 隐藏 Discord 社交链接 | `true` |

**配置方法**：在 `excalidraw-app/.env.development`（开发环境）或 `excalidraw-app/.env`（生产环境）中设置：

```bash
# 隐藏所有三个选项
VITE_SHOW_LIVE_COLLABORATION=false
VITE_SHOW_EXCALIDRAW_PLUS=false
VITE_SHOW_DISCORD=false
```

修改后需要重启开发服务器。

### Sidebar 自定义

```tsx
import { Excalidraw, Sidebar } from "@excalidraw/excalidraw";

<Excalidraw>
  <Sidebar name="customSidebar" docked={false}>
    <Sidebar.Header>自定义侧边栏</Sidebar.Header>

    <Sidebar.Tabs style={{ padding: "0.5rem" }}>
      <Sidebar.Tab tab="shapes">
        <h3>形状库</h3>
        <div>这里放置自定义形状...</div>
      </Sidebar.Tab>

      <Sidebar.Tab tab="settings">
        <h3>设置</h3>
        <div>这里放置设置选项...</div>
      </Sidebar.Tab>
    </Sidebar.Tabs>

    <Sidebar.TabTriggers>
      <Sidebar.TabTrigger tab="shapes">形状</Sidebar.TabTrigger>
      <Sidebar.TabTrigger tab="settings">设置</Sidebar.TabTrigger>
    </Sidebar.TabTriggers>
  </Sidebar>
</Excalidraw>;
```

### Footer 自定义

```tsx
import { Excalidraw, Footer } from "@excalidraw/excalidraw";

<Excalidraw>
  <Footer>
    <button onClick={() => console.log("Click!")}>自定义按钮</button>
    <span>自定义文本</span>
  </Footer>
</Excalidraw>;
```

### WelcomeScreen 自定义

```tsx
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";

<Excalidraw>
  <WelcomeScreen>
    <WelcomeScreen.Hints.MenuHint />
    <WelcomeScreen.Hints.ToolbarHint />
    <WelcomeScreen.Hints.HelpHint />

    <WelcomeScreen.Center>
      <WelcomeScreen.Center.Logo />
      <WelcomeScreen.Center.Heading>
        欢迎使用我的白板应用
      </WelcomeScreen.Center.Heading>

      <WelcomeScreen.Center.Menu>
        <WelcomeScreen.Center.MenuItemLoadScene />
        <WelcomeScreen.Center.MenuItemHelp />
        <WelcomeScreen.Center.MenuItem onSelect={() => {}}>
          自定义选项
        </WelcomeScreen.Center.MenuItem>
      </WelcomeScreen.Center.Menu>
    </WelcomeScreen.Center>
  </WelcomeScreen>
</Excalidraw>;
```

### 顶部 UI 自定义

```tsx
<Excalidraw
  renderTopLeftUI={() => (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        background: "white",
        padding: "0.5rem",
        borderRadius: "4px",
      }}
    >
      <button>按钮 1</button>
      <button>按钮 2</button>
    </div>
  )}
  renderTopRightUI={() => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span>用户: Alice</span>
      <button>分享</button>
    </div>
  )}
/>
```

---

## 8. 协作集成

### 基础协作设置

```tsx
const [collaborators, setCollaborators] = useState(new Map());

<Excalidraw
  isCollaborating={true}
  onPointerUpdate={(payload) => {
    // 发送自己的光标位置到服务器
    socket.emit("cursor-move", {
      pointer: payload.pointer,
      button: payload.button,
    });
  }}
/>;

// 接收其他用户的光标更新
socket.on("cursor-update", (data) => {
  setCollaborators((prev) => {
    const next = new Map(prev);
    next.set(data.oderId, {
      pointer: data.pointer,
      username: data.username,
      color: data.color,
    });
    return next;
  });

  excalidrawAPI.updateScene({ collaborators });
});
```

### Collaborator 类型

```typescript
type Collaborator = {
  pointer?: {
    x: number;
    y: number;
    tool: "pointer" | "laser";
    renderCursor?: boolean; // 是否渲染光标
    laserColor?: string; // 激光笔颜色
  };
  button?: "up" | "down";
  selectedElementIds?: Record<string, true>;
  username?: string;
  color?: {
    background: string;
    stroke: string;
  };
  avatarUrl?: string;
  id?: string;
  socketId?: string;
  isCurrentUser?: boolean;
  isInCall?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
};
```

### 同步元素变更

```tsx
<Excalidraw
  onChange={(elements, appState, files) => {
    // 节流发送元素变更
    throttledBroadcast({
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
      },
    });
  }}
/>;

// 接收远程变更
socket.on("scene-update", (data) => {
  excalidrawAPI.updateScene({
    elements: data.elements,
    appState: data.appState,
  });
});
```

### LiveCollaborationTrigger

```tsx
import { Excalidraw, LiveCollaborationTrigger } from "@excalidraw/excalidraw";

<Excalidraw>
  <LiveCollaborationTrigger
    isCollaborating={isCollaborating}
    onSelect={() => {
      // 开始/停止协作
      setIsCollaborating(!isCollaborating);
    }}
  />
</Excalidraw>;
```

---

## 9. 数据持久化

### 序列化为 JSON

```tsx
import { serializeAsJSON } from "@excalidraw/excalidraw";

const json = serializeAsJSON(
  excalidrawAPI.getSceneElements(),
  excalidrawAPI.getAppState(),
  excalidrawAPI.getFiles(),
  "local", // "local" | "database"
);

// 保存到 localStorage
localStorage.setItem("excalidraw-data", json);

// 或发送到服务器
await fetch("/api/save", {
  method: "POST",
  body: json,
  headers: { "Content-Type": "application/json" },
});
```

### 从 Blob 加载

```tsx
import {
  loadFromBlob,
  loadSceneOrLibraryFromBlob,
} from "@excalidraw/excalidraw";

// 从文件加载
const input = document.createElement("input");
input.type = "file";
input.accept = ".excalidraw,.json";
input.onchange = async (e) => {
  const file = e.target.files[0];
  const data = await loadFromBlob(file, null, null);
  excalidrawAPI.updateScene(data);
};
input.click();

// 从 URL 加载
const response = await fetch("/drawings/my-drawing.excalidraw");
const blob = await response.blob();
const data = await loadFromBlob(blob, null, null);
excalidrawAPI.updateScene(data);
```

### 恢复元素

```tsx
import { restoreElements, restoreAppState } from "@excalidraw/excalidraw";

// 从原始数据恢复（添加缺失的属性）
const restoredElements = restoreElements(rawElements, null);
const restoredAppState = restoreAppState(rawAppState, null);
```

### 形状库持久化

```tsx
import {
  serializeLibraryAsJSON,
  loadLibraryFromBlob,
  mergeLibraryItems,
  getLibraryItemsHash,
} from "@excalidraw/excalidraw";

// 监听库变更
<Excalidraw
  onLibraryChange={(items) => {
    const json = serializeLibraryAsJSON(items);
    localStorage.setItem("excalidraw-library", json);
  }}
/>;

// 加载库
const libraryBlob = new Blob([libraryJson], { type: "application/json" });
const libraryItems = await loadLibraryFromBlob(libraryBlob);
```

---

## 10. 框架集成

### Next.js (App Router)

```tsx
// app/components/ExcalidrawWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// 必须使用动态导入禁用 SSR
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

import "@excalidraw/excalidraw/index.css";

export default function ExcalidrawWrapper() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Excalidraw />
    </div>
  );
}
```

```tsx
// app/page.tsx
import ExcalidrawWrapper from "./components/ExcalidrawWrapper";

export default function Page() {
  return <ExcalidrawWrapper />;
}
```

### Next.js (Pages Router)

```tsx
// pages/editor.tsx
import dynamic from "next/dynamic";

const ExcalidrawWrapper = dynamic(
  () => import("../components/ExcalidrawWrapper"),
  { ssr: false },
);

export default function EditorPage() {
  return <ExcalidrawWrapper />;
}
```

### Vite

```tsx
// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw />
    </div>
  </React.StrictMode>,
);
```

### 资源路径配置

```tsx
// 设置静态资源路径（字体等）
window.EXCALIDRAW_ASSET_PATH = "/assets/";
```

---

## 11. 源码开发

### 项目结构

```
excalidraw/
├── packages/
│   ├── excalidraw/           # 主 React 组件
│   │   ├── index.tsx         # 入口文件
│   │   ├── components/       # UI 组件
│   │   │   ├── App.tsx       # 主应用组件
│   │   │   ├── Sidebar/
│   │   │   ├── main-menu/
│   │   │   └── ...
│   │   ├── actions/          # 动作处理
│   │   ├── data/             # 数据序列化
│   │   ├── fonts/            # 字体处理
│   │   ├── tests/            # 测试文件
│   │   │   └── helpers/      # 测试工具
│   │   └── editor-jotai.ts   # 状态管理
│   │
│   ├── element/              # 元素逻辑
│   │   ├── src/
│   │   │   ├── types.ts      # 元素类型定义
│   │   │   ├── newElement.ts # 创建元素
│   │   │   ├── binding.ts    # 箭头绑定
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── math/                 # 几何计算
│   │   └── src/
│   │       ├── types.ts      # 几何类型
│   │       ├── point.ts      # 点操作
│   │       ├── line.ts       # 线操作
│   │       └── ...
│   │
│   ├── common/               # 共享工具
│   │   └── src/
│   │       ├── constants.ts  # 常量
│   │       ├── keys.ts       # 键盘按键
│   │       └── ...
│   │
│   └── utils/                # 导出工具
│       └── src/
│           ├── export.ts
│           └── withinBounds.ts
│
├── excalidraw-app/           # Web 应用
│   ├── App.tsx
│   └── ...
│
└── examples/                 # 示例项目
    ├── with-nextjs/
    └── with-script-in-browser/
```

### 开发命令

```bash
# 安装依赖
yarn install

# 启动开发服务器
yarn start

# 运行测试
yarn test:app

# 运行特定测试
yarn test:app -- --grep "test name"
yarn test:app -- packages/excalidraw/tests/selection.test.tsx

# 类型检查
yarn test:typecheck

# 代码检查
yarn test:code

# 修复格式
yarn fix

# 构建所有包
yarn build:packages

# 测试覆盖率
yarn test:coverage
```

### 测试编写

```tsx
// packages/excalidraw/tests/myFeature.test.tsx
import { render } from "../test-utils";
import { Excalidraw } from "../index";
import { API } from "./helpers/api";
import { UI, Keyboard, Pointer } from "./helpers/ui";

describe("My Feature", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("should create rectangle", async () => {
    // 创建元素
    const rect = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    API.setElements([rect]);

    // 验证
    expect(API.getElements().length).toBe(1);
  });

  it("should select element on click", async () => {
    const rect = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
    API.setElements([rect]);

    // 模拟点击
    Pointer.click(100, 100);

    // 验证选中
    expect(API.getSelectedElements().length).toBe(1);
  });

  it("should delete on keypress", async () => {
    const rect = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
    API.setElements([rect]);
    API.setSelectedElements([rect]);

    // 按删除键
    Keyboard.keyDown("Delete");

    // 验证删除
    expect(API.getElements().filter((e) => !e.isDeleted).length).toBe(0);
  });
});
```

---

## 12. 类型系统

### 几何类型 (packages/math/src/types.ts)

```typescript
// 必须使用这些类型，不要使用 { x, y }
export type GlobalPoint = [x: number, y: number] & {
  _brand: "excalimath__globalpoint";
};
export type LocalPoint = [x: number, y: number] & {
  _brand: "excalimath__localpoint";
};
export type Radians = number & { _brand: "excalimath__radian" };
export type Degrees = number & { _brand: "excalimath_degree" };

// 几何图形
export type LineSegment<P> = [a: P, b: P] & {
  _brand: "excalimath_linesegment";
};
export type Polygon<P> = P[] & { _brand: "excalimath_polygon" };
export type Curve<P> = [P, P, P, P] & { _brand: "excalimath_curve" };
export type Ellipse<P> = { center: P; halfWidth: number; halfHeight: number };
```

### 创建几何对象

```typescript
import { pointFrom, lineSegment, polygon } from "@excalidraw/math";
import type { GlobalPoint } from "@excalidraw/math";

// 创建点
const point: GlobalPoint = pointFrom(100, 200);

// 创建线段
const segment = lineSegment(pointFrom(0, 0), pointFrom(100, 100));
```

### 元素类型

```typescript
import type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElement,
  ExcalidrawImageElement,
  ExcalidrawFrameElement,
  ExcalidrawEmbeddableElement,
} from "@excalidraw/excalidraw/element/types";
```

### 应用状态类型

```typescript
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  BinaryFileData,
  LibraryItems,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
```

---

## 官方资源

- **官方文档**: https://docs.excalidraw.com
- **API 文档**: https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api
- **NPM 包**: https://www.npmjs.com/package/@excalidraw/excalidraw
- **GitHub**: https://github.com/excalidraw/excalidraw
- **Discord**: https://discord.gg/UexuTaE
- **示例项目**: https://github.com/excalidraw/excalidraw/tree/master/examples
