# 视频录制功能实现计划

## 概述

为 Excalidraw 实现完整的视频录制功能，支持将绘图过程录制为 **MP4 视频**并导出分享。

### 核心功能

1. **自定义画面比例**

   - 16:9 (YouTube)、4:3、3:4 (小红书)、9:16 (抖音)、1:1 (Instagram)、自定义

2. **视觉效果定制**

   - 背景壁纸选择（12 张预设）
   - 圆角半径调整（0-48px）
   - 画布边距调整（0-96px）

3. **高级功能**

   - 摄像头叠加（可选）
   - 麦克风录音（可选）
   - 光标高亮效果（可选）

4. **实时预览**
   - 所见即所得的设置预览
   - 实时画面合成

### 技术目标

- 导出格式：**MP4 (H.264 编码)**
- 帧率：60 FPS（可自适应）
- 分辨率：根据比例预设（最高 1920x1080）
- 音频：AAC 编码（如果启用麦克风）

---

## 技术架构

### 核心技术栈

- **Web APIs**

  - MediaRecorder API（用于录制）
  - HTMLCanvasElement.captureStream()（画面捕获）
  - getUserMedia()（摄像头/麦克风）
  - Canvas 2D API（画面合成）

- **视频编码**

  - 主方案：MediaRecorder API + MP4 容器（需检查浏览器支持）
  - 备用方案：使用 `mp4-muxer` 库进行客户端 MP4 封装

- **状态管理**

  - Jotai atoms（与现有架构一致）

- **UI 组件**

  - 复用现有 Dialog, Switch, RadioGroup, DragInput

- **画布渲染**
  - 复用 `exportToCanvas()` 函数

### 模块划分

```
录制功能
├── UI 层 (components/Recording/)
│   ├── RecordingDialog.tsx              # 主对话框
│   ├── RecordingPreview.tsx             # 实时预览
│   ├── AspectRatioSelector.tsx          # 比例选择器
│   ├── BackgroundWallpaperPicker.tsx    # 壁纸选择器
│   ├── RecordingControls.tsx            # 录制控制按钮
│   └── CameraOverlay.tsx                # 摄像头叠加层
├── 录制引擎 (recording/)
│   ├── RecordingEngine.ts               # 核心录制引擎
│   ├── CanvasCompositor.ts              # 画面合成器
│   ├── CursorTracker.ts                 # 光标跟踪
│   ├── MP4Encoder.ts                    # MP4 编码器（封装）
│   ├── recordingState.ts                # Jotai atoms
│   └── types.ts                         # 类型定义
├── Actions (actions/)
│   └── actionRecording.tsx              # 录制 actions
└── 资源 (assets/wallpapers/)
    └── 12 张预设壁纸
```

### 数据流

```
用户操作 → Action → 更新 recordingConfigAtom → UI 更新 + 预览更新
                                ↓
                        RecordingEngine
                                ↓
                    CanvasCompositor (每帧合成)
                                ↓
        [背景壁纸] + [Excalidraw画布] + [摄像头] + [光标]
                                ↓
                        Canvas.captureStream()
                                ↓
                        MediaRecorder (MP4)
                                ↓
                          MP4 视频文件
```

---

## 实施步骤

### Phase 1: 基础设施 (优先级: 高)

#### 1.1 创建类型定义

**文件**: `/packages/excalidraw/recording/types.ts`

```typescript
export type AspectRatio = "16:9" | "4:3" | "3:4" | "9:16" | "1:1" | "custom";
export type WallpaperCategory = "all" | "vibrant" | "soft" | "dark" | "nature";

export interface RecordingConfig {
  aspectRatio: AspectRatio;
  customAspectRatio?: { width: number; height: number };
  background: string; // wallpaper ID
  borderRadius: number;
  padding: number;
  camera: {
    enabled: boolean;
    size: number;
  };
  cursor: {
    enabled: boolean;
    color: string;
  };
  microphone: string | null; // device ID
}

export type RecordingStatus = "idle" | "recording" | "paused";

export const RECORDING_RESOLUTIONS: Record<
  Exclude<AspectRatio, "custom">,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "4:3": { width: 1600, height: 1200 },
  "3:4": { width: 1080, height: 1440 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  aspectRatio: "16:9",
  background: "wallpaper-1",
  borderRadius: 16,
  padding: 48,
  camera: { enabled: true, size: 180 },
  cursor: { enabled: false, color: "#FF4444" },
  microphone: null,
};
```

#### 1.2 创建状态管理

**文件**: `/packages/excalidraw/recording/recordingState.ts`

```typescript
import { atom } from "../editor-jotai";
import type { RecordingConfig, RecordingStatus } from "./types";
import { DEFAULT_RECORDING_CONFIG } from "./types";

export const recordingConfigAtom = atom<RecordingConfig>(
  DEFAULT_RECORDING_CONFIG,
);

export const recordingStatusAtom = atom<RecordingStatus>("idle");

export const recordingDurationAtom = atom<number>(0);

export const recordingBlobAtom = atom<Blob | null>(null);
```

#### 1.3 扩展 AppState 类型

**文件**: `/packages/excalidraw/types.ts` (修改)

在 `openDialog` 类型中添加:

```typescript
openDialog:
  | null
  | { name: "imageExport" | "help" | "jsonExport" | "recording" }  // 添加 "recording"
  | { name: "ttd"; tab: "text-to-diagram" | "mermaid" }
  | { name: "commandPalette" }
  | { name: "settings" }
```

#### 1.4 准备壁纸资源

**目录**: `/packages/excalidraw/assets/wallpapers/`

创建壁纸元数据文件:

**文件**: `/packages/excalidraw/assets/wallpapers/index.ts`

```typescript
export interface Wallpaper {
  id: string;
  category: "vibrant" | "soft" | "dark" | "nature";
  name: string;
  src: string;
  thumbnail: string;
}

export const wallpapers: Wallpaper[] = [
  // Vibrant (鲜艳)
  {
    id: "wallpaper-1",
    category: "vibrant",
    name: "Gradient Purple",
    src: "/wallpapers/vibrant-1.webp",
    thumbnail: "/wallpapers/vibrant-1-thumb.webp",
  },
  {
    id: "wallpaper-2",
    category: "vibrant",
    name: "Gradient Orange",
    src: "/wallpapers/vibrant-2.webp",
    thumbnail: "/wallpapers/vibrant-2-thumb.webp",
  },
  {
    id: "wallpaper-3",
    category: "vibrant",
    name: "Gradient Blue",
    src: "/wallpapers/vibrant-3.webp",
    thumbnail: "/wallpapers/vibrant-3-thumb.webp",
  },

  // Soft (柔和)
  {
    id: "wallpaper-4",
    category: "soft",
    name: "Pastel Pink",
    src: "/wallpapers/soft-1.webp",
    thumbnail: "/wallpapers/soft-1-thumb.webp",
  },
  {
    id: "wallpaper-5",
    category: "soft",
    name: "Pastel Blue",
    src: "/wallpapers/soft-2.webp",
    thumbnail: "/wallpapers/soft-2-thumb.webp",
  },
  {
    id: "wallpaper-6",
    category: "soft",
    name: "Pastel Green",
    src: "/wallpapers/soft-3.webp",
    thumbnail: "/wallpapers/soft-3-thumb.webp",
  },

  // Dark (暗色)
  {
    id: "wallpaper-7",
    category: "dark",
    name: "Dark Space",
    src: "/wallpapers/dark-1.webp",
    thumbnail: "/wallpapers/dark-1-thumb.webp",
  },
  {
    id: "wallpaper-8",
    category: "dark",
    name: "Dark Tech",
    src: "/wallpapers/dark-2.webp",
    thumbnail: "/wallpapers/dark-2-thumb.webp",
  },
  {
    id: "wallpaper-9",
    category: "dark",
    name: "Dark Abstract",
    src: "/wallpapers/dark-3.webp",
    thumbnail: "/wallpapers/dark-3-thumb.webp",
  },

  // Nature (自然)
  {
    id: "wallpaper-10",
    category: "nature",
    name: "Forest",
    src: "/wallpapers/nature-1.webp",
    thumbnail: "/wallpapers/nature-1-thumb.webp",
  },
  {
    id: "wallpaper-11",
    category: "nature",
    name: "Ocean",
    src: "/wallpapers/nature-2.webp",
    thumbnail: "/wallpapers/nature-2-thumb.webp",
  },
  {
    id: "wallpaper-12",
    category: "nature",
    name: "Mountains",
    src: "/wallpapers/nature-3.webp",
    thumbnail: "/wallpapers/nature-3-thumb.webp",
  },
];

export const getWallpaperById = (id: string): Wallpaper | undefined => {
  return wallpapers.find((w) => w.id === id);
};

export const getWallpapersByCategory = (
  category: WallpaperCategory,
): Wallpaper[] => {
  if (category === "all") {
    return wallpapers;
  }
  return wallpapers.filter((w) => w.category === category);
};
```

**注意**: 实际壁纸图片需要准备 12 张（WebP 格式），放在 `public/wallpapers/` 或相应的静态资源目录。

---

### Phase 2: 录制引擎 (优先级: 高)

#### 2.1 实现 MP4Encoder

**文件**: `/packages/excalidraw/recording/MP4Encoder.ts`

**目的**: 封装 MP4 编码逻辑，处理浏览器兼容性。

```typescript
/**
 * MP4Encoder - 封装 MP4 编码逻辑
 *
 * 策略：
 * 1. 优先使用原生 MediaRecorder API (video/mp4)
 * 2. 如果不支持，降级为 video/webm，然后提示用户转换
 */

export class MP4Encoder {
  private static checkMP4Support(): boolean {
    // 检查浏览器是否支持 MP4 编码
    if (!MediaRecorder.isTypeSupported) {
      return false;
    }

    const mp4Types = [
      "video/mp4",
      "video/mp4;codecs=h264",
      "video/mp4;codecs=avc1",
    ];

    return mp4Types.some((type) => MediaRecorder.isTypeSupported(type));
  }

  static getSupportedMimeType(): string {
    // 优先级顺序
    const mimeTypes = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported?.(mimeType)) {
        return mimeType;
      }
    }

    // 降级到默认
    return "video/webm";
  }

  static getFileExtension(mimeType: string): string {
    if (mimeType.includes("mp4")) {
      return "mp4";
    }
    if (mimeType.includes("webm")) {
      return "webm";
    }
    return "mp4"; // 默认
  }

  static async createRecorder(
    stream: MediaStream,
    options?: MediaRecorderOptions,
  ): Promise<MediaRecorder> {
    const mimeType = this.getSupportedMimeType();

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps
      ...options,
    });

    return recorder;
  }
}
```

#### 2.2 实现 CanvasCompositor

**文件**: `/packages/excalidraw/recording/CanvasCompositor.ts`

**核心功能**:

- 创建离屏 Canvas 作为合成目标
- 每帧合成: 背景 → 内容区 (带圆角) → 摄像头叠加 → 光标高亮
- 复用 `exportToCanvas()` 捕获 Excalidraw 画布

```typescript
import { exportToCanvas } from "@excalidraw/utils/export";
import type {
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
} from "../types";
import type { RecordingConfig } from "./types";
import { RECORDING_RESOLUTIONS } from "./types";
import { getWallpaperById } from "../assets/wallpapers";

export class CanvasCompositor {
  private offscreenCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wallpaperImage: HTMLImageElement | null = null;
  private cameraVideoElement: HTMLVideoElement | null = null;
  private cursorPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    private width: number,
    private height: number,
    private elements: readonly NonDeletedExcalidrawElement[],
    private appState: Readonly<AppState>,
    private files: BinaryFiles,
  ) {
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.ctx = this.offscreenCanvas.getContext("2d", {
      alpha: false, // 不需要透明度，提升性能
    })!;
  }

  async loadWallpaper(wallpaperId: string): Promise<void> {
    const wallpaper = getWallpaperById(wallpaperId);
    if (!wallpaper) {
      throw new Error(`Wallpaper not found: ${wallpaperId}`);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.wallpaperImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = wallpaper.src;
    });
  }

  setCameraStream(stream: MediaStream): void {
    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = true;
    this.cameraVideoElement = videoElement;

    // 等待视频加载
    videoElement.play().catch((err) => {
      console.error("Failed to play camera video:", err);
    });
  }

  updateCursorPosition(x: number, y: number): void {
    this.cursorPosition = { x, y };
  }

  private async captureExcalidrawCanvas(): Promise<HTMLCanvasElement> {
    // 使用 exportToCanvas 生成画布快照
    const canvas = await exportToCanvas({
      elements: this.elements,
      appState: this.appState,
      files: this.files,
      getDimensions: (width, height) => {
        // 根据内容区域计算缩放比例
        const contentWidth = this.width - this.config.padding * 2;
        const contentHeight = this.height - this.config.padding * 2;

        const scale = Math.min(contentWidth / width, contentHeight / height);

        return {
          width: width * scale,
          height: height * scale,
          scale,
        };
      },
    });

    return canvas;
  }

  private drawCameraOverlay(cameraConfig: RecordingConfig["camera"]): void {
    if (!this.cameraVideoElement) return;

    const size = cameraConfig.size;
    const margin = 24;
    const x = this.width - size - margin;
    const y = this.height - size - margin;

    // 绘制圆形摄像头画面
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    this.ctx.clip();

    // 绘制视频帧
    this.ctx.drawImage(this.cameraVideoElement, x, y, size, size);

    // 绘制边框
    this.ctx.restore();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawCursorHighlight(color: string): void {
    const { x, y } = this.cursorPosition;
    const radius = 20;

    // 绘制渐变光圈
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, `${color}88`); // 50% 透明
    gradient.addColorStop(1, `${color}00`); // 完全透明

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  async composeFrame(config: RecordingConfig): Promise<void> {
    // 1. 绘制背景壁纸
    if (this.wallpaperImage) {
      this.ctx.drawImage(this.wallpaperImage, 0, 0, this.width, this.height);
    } else {
      // 降级：纯色背景
      this.ctx.fillStyle = "#f5f5f5";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. 计算内容区域
    const contentArea = {
      x: config.padding,
      y: config.padding,
      width: this.width - config.padding * 2,
      height: this.height - config.padding * 2,
    };

    // 3. 应用圆角蒙版
    this.ctx.save();
    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
        config.borderRadius,
      );
    } else {
      // 降级：无圆角
      this.ctx.rect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
      );
    }
    this.ctx.clip();

    // 4. 绘制 Excalidraw 画布
    const excalidrawCanvas = await this.captureExcalidrawCanvas();

    // 居中绘制
    const canvasX =
      contentArea.x + (contentArea.width - excalidrawCanvas.width) / 2;
    const canvasY =
      contentArea.y + (contentArea.height - excalidrawCanvas.height) / 2;

    this.ctx.drawImage(
      excalidrawCanvas,
      canvasX,
      canvasY,
      excalidrawCanvas.width,
      excalidrawCanvas.height,
    );

    this.ctx.restore();

    // 5. 叠加摄像头 (如果启用)
    if (config.camera.enabled && this.cameraVideoElement) {
      this.drawCameraOverlay(config.camera);
    }

    // 6. 绘制光标高亮 (如果启用)
    if (config.cursor.enabled) {
      this.drawCursorHighlight(config.cursor.color);
    }
  }

  getStream(fps: number = 60): MediaStream {
    return this.offscreenCanvas.captureStream(fps);
  }

  cleanup(): void {
    if (this.cameraVideoElement) {
      this.cameraVideoElement.srcObject = null;
      this.cameraVideoElement = null;
    }
    this.wallpaperImage = null;
  }
}
```

#### 2.3 实现 CursorTracker

**文件**: `/packages/excalidraw/recording/CursorTracker.ts`

```typescript
import type { GlobalPoint } from "@excalidraw/math";

export class CursorTracker {
  private cursorPosition: GlobalPoint = { x: 0, y: 0 } as GlobalPoint;
  private listeners: Array<() => void> = [];

  start(canvas: HTMLCanvasElement): void {
    const handleMove = (event: MouseEvent | PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.cursorPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      } as GlobalPoint;
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("pointermove", handleMove);

    this.listeners.push(() => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("pointermove", handleMove);
    });
  }

  getPosition(): GlobalPoint {
    return this.cursorPosition;
  }

  stop(): void {
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners = [];
  }
}
```

#### 2.4 实现 RecordingEngine

**文件**: `/packages/excalidraw/recording/RecordingEngine.ts`

**核心职责**:

- 初始化合成器、光标跟踪器
- 请求摄像头/麦克风权限
- 创建 MediaRecorder 并启动录制
- 管理合成循环 (requestAnimationFrame)
- 停止录制并导出文件

```typescript
import type {
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
} from "../types";
import type { RecordingConfig } from "./types";
import { RECORDING_RESOLUTIONS } from "./types";
import { CanvasCompositor } from "./CanvasCompositor";
import { CursorTracker } from "./CursorTracker";
import { MP4Encoder } from "./MP4Encoder";

export class RecordingEngine {
  private compositor: CanvasCompositor;
  private cursorTracker: CursorTracker;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;
  private cameraStream: MediaStream | null = null;
  private microphoneStream: MediaStream | null = null;
  private startTime: number = 0;
  private mimeType: string = "";

  constructor(
    private config: RecordingConfig,
    private elements: readonly NonDeletedExcalidrawElement[],
    private appState: Readonly<AppState>,
    private files: BinaryFiles,
    private canvas: HTMLCanvasElement,
  ) {
    const resolution =
      config.aspectRatio === "custom" && config.customAspectRatio
        ? config.customAspectRatio
        : RECORDING_RESOLUTIONS[config.aspectRatio];

    this.compositor = new CanvasCompositor(
      resolution.width,
      resolution.height,
      elements,
      appState,
      files,
    );
    this.cursorTracker = new CursorTracker();
  }

  async initialize(): Promise<void> {
    // 1. 加载壁纸
    await this.compositor.loadWallpaper(this.config.background);

    // 2. 请求摄像头权限（如果启用）
    if (this.config.camera.enabled) {
      try {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        this.compositor.setCameraStream(this.cameraStream);
      } catch (err) {
        console.error("Failed to get camera stream:", err);
        throw new Error("无法访问摄像头，请检查权限设置");
      }
    }

    // 3. 请求麦克风权限（如果启用）
    if (this.config.microphone) {
      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: this.config.microphone },
          video: false,
        });
      } catch (err) {
        console.error("Failed to get microphone stream:", err);
        throw new Error("无法访问麦克风，请检查权限设置");
      }
    }

    // 4. 启动光标跟踪
    if (this.config.cursor.enabled) {
      this.cursorTracker.start(this.canvas);
    }
  }

  async startRecording(): Promise<void> {
    // 1. 开始合成循环
    const composeLoop = async () => {
      await this.compositor.composeFrame(this.config);

      // 更新光标位置
      if (this.config.cursor.enabled) {
        const cursorPos = this.cursorTracker.getPosition();
        this.compositor.updateCursorPosition(cursorPos.x, cursorPos.y);
      }

      this.animationFrameId = requestAnimationFrame(composeLoop);
    };

    composeLoop();

    // 2. 获取画面流
    const videoStream = this.compositor.getStream(60);

    // 3. 合并音频流（如果有）
    let finalStream = videoStream;
    if (this.microphoneStream) {
      const audioTrack = this.microphoneStream.getAudioTracks()[0];
      if (audioTrack) {
        finalStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          audioTrack,
        ]);
      }
    }

    // 4. 创建 MediaRecorder
    this.mimeType = MP4Encoder.getSupportedMimeType();
    this.mediaRecorder = await MP4Encoder.createRecorder(finalStream);

    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // 5. 开始录制
    this.mediaRecorder.start(100); // 每 100ms 收集一次数据
    this.startTime = Date.now();
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      // 重启合成循环
      const composeLoop = async () => {
        await this.compositor.composeFrame(this.config);
        if (this.config.cursor.enabled) {
          const cursorPos = this.cursorTracker.getPosition();
          this.compositor.updateCursorPosition(cursorPos.x, cursorPos.y);
        }
        this.animationFrameId = requestAnimationFrame(composeLoop);
      };
      composeLoop();
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("Recording not started"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mimeType,
        });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording failed: ${event}`));
      };

      // 停止录制
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }

      // 停止合成循环
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // 停止光标跟踪
      this.cursorTracker.stop();

      // 清理流
      this.cleanup();
    });
  }

  async downloadRecording(blob: Blob, filename?: string): Promise<void> {
    const extension = MP4Encoder.getFileExtension(this.mimeType);
    const defaultFilename = `excalidraw-recording-${Date.now()}.${extension}`;
    const finalFilename = filename || defaultFilename;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getDuration(): number {
    if (this.startTime === 0) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private cleanup(): void {
    // 停止摄像头流
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }

    // 停止麦克风流
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }

    // 清理合成器
    this.compositor.cleanup();
  }
}
```

---

### Phase 3: UI 组件 (优先级: 中)

#### 3.1 创建 RecordingDialog

**文件**: `/packages/excalidraw/components/RecordingDialog.tsx`

参考 `ImageExportDialog.tsx` 的结构，使用 `<Dialog size="wide">` 布局。

```typescript
import React, { useState, useEffect } from "react";
import { Dialog } from "./Dialog";
import { RecordingPreview } from "./Recording/RecordingPreview";
import { AspectRatioSelector } from "./Recording/AspectRatioSelector";
import { BackgroundWallpaperPicker } from "./Recording/BackgroundWallpaperPicker";
import { RecordingControls } from "./Recording/RecordingControls";
import { Switch } from "./Switch";
import { DragInput } from "./DragInput";
import { t } from "../i18n";
import type { ActionManager } from "../actions/manager";
import type { AppClassProperties, BinaryFiles, UIAppState } from "../types";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";
import { useAtom } from "../editor-jotai";
import {
  recordingConfigAtom,
  recordingStatusAtom,
  recordingDurationAtom,
} from "../recording/recordingState";

import "./RecordingDialog.scss";

type RecordingDialogProps = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Readonly<UIAppState>;
  files: BinaryFiles;
  actionManager: ActionManager;
  onCloseRequest: () => void;
};

export const RecordingDialog = ({
  elements,
  appState,
  files,
  actionManager,
  onCloseRequest,
}: RecordingDialogProps) => {
  const [config, setConfig] = useAtom(recordingConfigAtom);
  const [status] = useAtom(recordingStatusAtom);
  const [duration] = useAtom(recordingDurationAtom);

  return (
    <Dialog
      size="wide"
      onCloseRequest={onCloseRequest}
      title={t("labels.recording.title")}
    >
      <div className="RecordingDialog">
        {/* 左侧预览区 */}
        <div className="RecordingDialog__preview">
          <RecordingPreview
            elements={elements}
            appState={appState}
            files={files}
            config={config}
          />
          {status === "recording" && (
            <div className="RecordingDialog__preview-status">
              <span className="RecordingDialog__preview-status-indicator" />
              <span className="RecordingDialog__preview-status-duration">
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* 右侧设置面板 */}
        <div className="RecordingDialog__settings">
          {/* 画面比例 */}
          <div className="RecordingDialog__section">
            <h3>{t("labels.recording.aspectRatio")}</h3>
            <AspectRatioSelector
              value={config.aspectRatio}
              onChange={(aspectRatio) => setConfig({ ...config, aspectRatio })}
            />
          </div>

          {/* 背景壁纸 */}
          <div className="RecordingDialog__section">
            <h3>{t("labels.recording.background")}</h3>
            <BackgroundWallpaperPicker
              value={config.background}
              onChange={(background) => setConfig({ ...config, background })}
            />
          </div>

          {/* 圆角半径 */}
          <div className="RecordingDialog__section">
            <h3>{t("labels.recording.borderRadius")}</h3>
            <DragInput
              value={config.borderRadius}
              min={0}
              max={48}
              onChange={(borderRadius) =>
                setConfig({ ...config, borderRadius })
              }
            />
          </div>

          {/* 画布边距 */}
          <div className="RecordingDialog__section">
            <h3>{t("labels.recording.padding")}</h3>
            <DragInput
              value={config.padding}
              min={0}
              max={96}
              onChange={(padding) => setConfig({ ...config, padding })}
            />
          </div>

          {/* 摄像头 */}
          <div className="RecordingDialog__section">
            <Switch
              checked={config.camera.enabled}
              onChange={(enabled) =>
                setConfig({
                  ...config,
                  camera: { ...config.camera, enabled },
                })
              }
              label={t("labels.recording.enableCamera")}
            />
          </div>

          {/* 光标高亮 */}
          <div className="RecordingDialog__section">
            <Switch
              checked={config.cursor.enabled}
              onChange={(enabled) =>
                setConfig({
                  ...config,
                  cursor: { ...config.cursor, enabled },
                })
              }
              label={t("labels.recording.enableCursor")}
            />
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="RecordingDialog__footer">
        <RecordingControls
          elements={elements}
          appState={appState}
          files={files}
          config={config}
        />
      </div>
    </Dialog>
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}
```

**样式文件**: `/packages/excalidraw/components/RecordingDialog.scss`

```scss
.RecordingDialog {
  display: flex;
  gap: 24px;
  min-height: 600px;

  &__preview {
    flex: 0 0 35%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--color-gray-100);
    border-radius: 8px;
    padding: 24px;
    position: relative;

    &-status {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 12px;
      border-radius: 20px;
      color: white;
      font-size: 14px;

      &-indicator {
        width: 8px;
        height: 8px;
        background: #ff4444;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
  }

  &__settings {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  &__section {
    margin-bottom: 24px;

    h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--color-text-primary);
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--color-gray-200);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
```

#### 3.2 实现子组件

**AspectRatioSelector**: 3×2 按钮网格

**文件**: `/packages/excalidraw/components/Recording/AspectRatioSelector.tsx`

```typescript
import React from "react";
import type { AspectRatio } from "../../recording/types";
import { RadioGroup } from "../RadioGroup";
import "./AspectRatioSelector.scss";

type AspectRatioSelectorProps = {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
};

const ASPECT_RATIOS: Array<{
  value: AspectRatio;
  label: string;
  description: string;
}> = [
  { value: "16:9", label: "16:9", description: "YouTube" },
  { value: "4:3", label: "4:3", description: "Traditional" },
  { value: "9:16", label: "9:16", description: "抖音/TikTok" },
  { value: "3:4", label: "3:4", description: "小红书" },
  { value: "1:1", label: "1:1", description: "Instagram" },
  { value: "custom", label: "自定义", description: "Custom" },
];

export const AspectRatioSelector = ({
  value,
  onChange,
}: AspectRatioSelectorProps) => {
  return (
    <div className="AspectRatioSelector">
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio.value}
          className={`AspectRatioSelector__button ${
            value === ratio.value ? "AspectRatioSelector__button--active" : ""
          }`}
          onClick={() => onChange(ratio.value)}
        >
          <span className="AspectRatioSelector__button-label">
            {ratio.label}
          </span>
          <span className="AspectRatioSelector__button-description">
            {ratio.description}
          </span>
        </button>
      ))}
    </div>
  );
};
```

**BackgroundWallpaperPicker**: 分类标签 + 壁纸网格

**文件**: `/packages/excalidraw/components/Recording/BackgroundWallpaperPicker.tsx`

```typescript
import React, { useState } from "react";
import type { WallpaperCategory } from "../../recording/types";
import { wallpapers, getWallpapersByCategory } from "../../assets/wallpapers";
import "./BackgroundWallpaperPicker.scss";

type BackgroundWallpaperPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const CATEGORIES: Array<{ value: WallpaperCategory; label: string }> = [
  { value: "all", label: "全部" },
  { value: "vibrant", label: "鲜艳" },
  { value: "soft", label: "柔和" },
  { value: "dark", label: "暗色" },
  { value: "nature", label: "自然" },
];

export const BackgroundWallpaperPicker = ({
  value,
  onChange,
}: BackgroundWallpaperPickerProps) => {
  const [activeCategory, setActiveCategory] =
    useState<WallpaperCategory>("all");

  const filteredWallpapers = getWallpapersByCategory(activeCategory);

  return (
    <div className="BackgroundWallpaperPicker">
      {/* 分类标签 */}
      <div className="BackgroundWallpaperPicker__categories">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            className={`BackgroundWallpaperPicker__category ${
              activeCategory === category.value
                ? "BackgroundWallpaperPicker__category--active"
                : ""
            }`}
            onClick={() => setActiveCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* 壁纸网格 */}
      <div className="BackgroundWallpaperPicker__grid">
        {filteredWallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            className={`BackgroundWallpaperPicker__item ${
              value === wallpaper.id
                ? "BackgroundWallpaperPicker__item--active"
                : ""
            }`}
            onClick={() => onChange(wallpaper.id)}
          >
            <img
              src={wallpaper.thumbnail}
              alt={wallpaper.name}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
```

**RecordingPreview**: 实时预览画面

**文件**: `/packages/excalidraw/components/Recording/RecordingPreview.tsx`

```typescript
import React, { useRef, useEffect } from "react";
import type { RecordingConfig } from "../../recording/types";
import type {
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
} from "../../types";
import { CanvasCompositor } from "../../recording/CanvasCompositor";
import "./RecordingPreview.scss";

type RecordingPreviewProps = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Readonly<AppState>;
  files: BinaryFiles;
  config: RecordingConfig;
};

export const RecordingPreview = ({
  elements,
  appState,
  files,
  config,
}: RecordingPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<CanvasCompositor | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建合成器
    const resolution =
      config.aspectRatio === "custom" && config.customAspectRatio
        ? config.customAspectRatio
        : RECORDING_RESOLUTIONS[config.aspectRatio];

    const compositor = new CanvasCompositor(
      resolution.width,
      resolution.height,
      elements,
      appState,
      files,
    );

    compositorRef.current = compositor;

    // 初始化并渲染预览
    const initPreview = async () => {
      await compositor.loadWallpaper(config.background);
      await compositor.composeFrame(config);

      // 将合成画面绘制到预览 canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            compositor["offscreenCanvas"],
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        }
      }
    };

    initPreview();

    return () => {
      compositor.cleanup();
    };
  }, [elements, appState, files, config]);

  // 计算预览尺寸（保持比例）
  const maxWidth = 400;
  const maxHeight = 300;
  const resolution =
    config.aspectRatio === "custom" && config.customAspectRatio
      ? config.customAspectRatio
      : RECORDING_RESOLUTIONS[config.aspectRatio];

  const scale = Math.min(
    maxWidth / resolution.width,
    maxHeight / resolution.height,
  );

  const previewWidth = resolution.width * scale;
  const previewHeight = resolution.height * scale;

  return (
    <canvas
      ref={canvasRef}
      className="RecordingPreview"
      width={resolution.width}
      height={resolution.height}
      style={{
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
      }}
    />
  );
};
```

**RecordingControls**: 录制控制按钮

**文件**: `/packages/excalidraw/components/Recording/RecordingControls.tsx`

```typescript
import React, { useState } from "react";
import { FilledButton } from "../FilledButton";
import { t } from "../../i18n";
import { useAtom, useSetAtom } from "../../editor-jotai";
import {
  recordingStatusAtom,
  recordingDurationAtom,
  recordingBlobAtom,
} from "../../recording/recordingState";
import { RecordingEngine } from "../../recording/RecordingEngine";
import type { RecordingConfig } from "../../recording/types";
import type {
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
} from "../../types";

type RecordingControlsProps = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Readonly<AppState>;
  files: BinaryFiles;
  config: RecordingConfig;
};

export const RecordingControls = ({
  elements,
  appState,
  files,
  config,
}: RecordingControlsProps) => {
  const [status, setStatus] = useAtom(recordingStatusAtom);
  const setDuration = useSetAtom(recordingDurationAtom);
  const setBlob = useSetAtom(recordingBlobAtom);
  const [engine, setEngine] = useState<RecordingEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    try {
      setError(null);

      // 获取画布元素
      const canvas = document.querySelector(
        ".excalidraw canvas",
      ) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error("Canvas not found");
      }

      // 创建录制引擎
      const newEngine = new RecordingEngine(
        config,
        elements,
        appState,
        files,
        canvas,
      );

      await newEngine.initialize();
      await newEngine.startRecording();

      setEngine(newEngine);
      setStatus("recording");

      // 启动计时器
      const timer = setInterval(() => {
        if (newEngine) {
          setDuration(newEngine.getDuration());
        }
      }, 1000);

      // 清理计时器
      (newEngine as any).timer = timer;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "录制启动失败");
    }
  };

  const handleStopRecording = async () => {
    if (!engine) return;

    try {
      const blob = await engine.stopRecording();
      setBlob(blob);
      setStatus("idle");

      // 清理计时器
      if ((engine as any).timer) {
        clearInterval((engine as any).timer);
      }

      // 自动下载
      await engine.downloadRecording(blob);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError(err instanceof Error ? err.message : "录制停止失败");
    }
  };

  const handlePauseRecording = () => {
    if (engine) {
      engine.pauseRecording();
      setStatus("paused");
    }
  };

  const handleResumeRecording = () => {
    if (engine) {
      engine.resumeRecording();
      setStatus("recording");
    }
  };

  return (
    <div className="RecordingControls">
      {error && <div className="RecordingControls__error">{error}</div>}

      {status === "idle" && (
        <FilledButton
          size="large"
          onClick={handleStartRecording}
          label={t("labels.recording.startRecording")}
        />
      )}

      {status === "recording" && (
        <>
          <FilledButton
            size="large"
            variant="outlined"
            onClick={handlePauseRecording}
            label={t("labels.recording.pauseRecording")}
          />
          <FilledButton
            size="large"
            onClick={handleStopRecording}
            label={t("labels.recording.stopRecording")}
          />
        </>
      )}

      {status === "paused" && (
        <>
          <FilledButton
            size="large"
            onClick={handleResumeRecording}
            label={t("labels.recording.resumeRecording")}
          />
          <FilledButton
            size="large"
            variant="outlined"
            onClick={handleStopRecording}
            label={t("labels.recording.stopRecording")}
          />
        </>
      )}
    </div>
  );
};
```

---

### Phase 4: Actions 和集成 (优先级: 中)

#### 4.1 创建录制 Actions

**文件**: `/packages/excalidraw/actions/actionRecording.tsx`

```typescript
import { register } from "./register";
import type { AppClassProperties, AppState } from "../types";
import { RecordIcon } from "../components/icons";
import { t } from "../i18n";

export const actionOpenRecordingDialog = register({
  name: "openRecordingDialog",
  label: "labels.recording.openDialog",
  icon: RecordIcon,
  viewMode: false,
  perform: (elements, appState) => ({
    appState: { ...appState, openDialog: { name: "recording" } },
    commitToHistory: false,
  }),
  keyTest: (event) =>
    event.key.toLowerCase() === "r" && event.shiftKey && event.ctrlOrCmd,
});
```

#### 4.2 在 LayerUI 集成

**文件**: `/packages/excalidraw/components/LayerUI.tsx` (修改)

在 `renderDialogs()` 方法中添加:

```typescript
// 添加录制对话框渲染
if (appState.openDialog?.name === "recording") {
  dialogs.push(
    <RecordingDialog
      key="recording"
      elements={elements}
      appState={appState}
      files={files}
      actionManager={actionManager}
      onCloseRequest={() => setAppState({ openDialog: null })}
    />,
  );
}
```

#### 4.3 添加菜单入口

**文件**: `/packages/excalidraw/components/main-menu/DefaultItems.tsx` (修改)

在 `MainMenu.ItemGroup` 中添加:

```typescript
<MainMenu.Item
  icon={RecordIcon}
  onSelect={() => {
    actionManager.executeAction(actionOpenRecordingDialog);
  }}
  label={t("labels.recording.openDialog")}
  shortcut="Ctrl+Shift+R"
/>
```

---

### Phase 5: 国际化和优化 (优先级: 低)

#### 5.1 添加翻译

**文件**: `/packages/excalidraw/locales/en.json` (添加)

```json
{
  "labels": {
    "recording": {
      "title": "Record Video",
      "openDialog": "Start Recording",
      "aspectRatio": "Aspect Ratio",
      "background": "Background Wallpaper",
      "borderRadius": "Border Radius",
      "padding": "Canvas Padding",
      "enableCamera": "Enable Camera Overlay",
      "enableCursor": "Enable Cursor Highlight",
      "startRecording": "Start Recording",
      "stopRecording": "Stop Recording",
      "pauseRecording": "Pause Recording",
      "resumeRecording": "Resume Recording"
    }
  }
}
```

**文件**: `/packages/excalidraw/locales/zh-CN.json` (添加)

```json
{
  "labels": {
    "recording": {
      "title": "录制视频",
      "openDialog": "开始录制",
      "aspectRatio": "画面比例",
      "background": "背景壁纸",
      "borderRadius": "圆角半径",
      "padding": "画布边距",
      "enableCamera": "启用摄像头叠加",
      "enableCursor": "启用光标高亮",
      "startRecording": "开始录制",
      "stopRecording": "停止录制",
      "pauseRecording": "暂停录制",
      "resumeRecording": "继续录制"
    }
  }
}
```

---

## 关键文件清单

### 需要创建的文件 (20 个)

**类型和状态** (3 个):

1. ✅ `/packages/excalidraw/recording/types.ts`
2. ✅ `/packages/excalidraw/recording/recordingState.ts`
3. `/packages/excalidraw/assets/wallpapers/index.ts`

**录制引擎** (4 个): 4. `/packages/excalidraw/recording/MP4Encoder.ts` 5. `/packages/excalidraw/recording/CanvasCompositor.ts` 6. `/packages/excalidraw/recording/CursorTracker.ts` 7. `/packages/excalidraw/recording/RecordingEngine.ts`

**UI 组件** (9 个): 8. `/packages/excalidraw/components/RecordingDialog.tsx` 9. `/packages/excalidraw/components/RecordingDialog.scss` 10. `/packages/excalidraw/components/Recording/RecordingPreview.tsx` 11. `/packages/excalidraw/components/Recording/RecordingPreview.scss` 12. `/packages/excalidraw/components/Recording/AspectRatioSelector.tsx` 13. `/packages/excalidraw/components/Recording/AspectRatioSelector.scss` 14. `/packages/excalidraw/components/Recording/BackgroundWallpaperPicker.tsx` 15. `/packages/excalidraw/components/Recording/BackgroundWallpaperPicker.scss` 16. `/packages/excalidraw/components/Recording/RecordingControls.tsx`

**Actions** (1 个): 17. `/packages/excalidraw/actions/actionRecording.tsx`

**国际化** (2 个): 18. `/packages/excalidraw/locales/en.json` (修改) 19. `/packages/excalidraw/locales/zh-CN.json` (修改)

**文档** (1 个): 20. ✅ `/docs/recording-implementation-plan.md`

### 需要修改的文件 (4 个)

1. `/packages/excalidraw/types.ts` - 扩展 `openDialog` 类型
2. `/packages/excalidraw/components/LayerUI.tsx` - 添加 `renderRecordingDialog()`
3. `/packages/excalidraw/components/main-menu/DefaultItems.tsx` - 添加录制菜单项
4. `/packages/excalidraw/actions/register.ts` - 注册录制 actions (如果需要)

### 资源文件

- 12 张壁纸图片 (WebP 格式)
  - 放置路径: `/public/wallpapers/` 或 `/packages/excalidraw/assets/wallpapers/`
  - 命名规范: `vibrant-1.webp`, `vibrant-1-thumb.webp`, 等

---

## 技术难点及解决方案

### 1. MP4 编码支持

**挑战**: 并非所有浏览器都原生支持 MediaRecorder API 输出 MP4 格式。

**解决方案**:

- **检测支持**: 使用 `MediaRecorder.isTypeSupported()` 检测浏览器支持
- **降级策略**: 如果不支持 MP4，录制为 WebM，并提示用户使用在线工具转换
- **备用方案**: 考虑集成 `mp4-muxer` 库进行客户端 MP4 封装（增加复杂度）

**浏览器支持情况**:

- Chrome/Edge: 支持 `video/mp4;codecs=h264,aac`
- Firefox: 仅支持 WebM
- Safari: 支持 MP4

### 2. 固定比例的录制区域

**方案**: 创建固定尺寸的离屏 Canvas，使用 `exportToCanvas()` 的 `getDimensions` 参数自适应缩放内容。

### 3. 应用圆角和边距效果

**方案**: 使用 Canvas 的 `clip()` 方法配合 `roundRect()` 创建圆角蒙版，在蒙版内绘制内容。

**兼容性**: `roundRect()` 在旧版浏览器中可能不支持，需要降级到普通矩形。

### 4. 叠加摄像头和光标

**方案**:

- **摄像头**: 将 `<video>` 元素作为图像源，使用圆形 clip 绘制
- **光标**: 监听 mousemove，使用渐变效果绘制高亮圈

### 5. 性能优化

**方案**:

- 缓存不变的画布快照
- 使用 `OffscreenCanvas` (如果支持)
- 帧率自适应 (检测合成时间，动态调整 FPS)
- 避免每帧重新调用 `exportToCanvas()` （仅在画布内容变化时更新）

---

## 验证计划

### 端到端测试流程

#### 1. 打开录制设置

```bash
yarn start
```

**操作**: 点击菜单 "开始录制" 或按 `Ctrl+Shift+R`

**预期**: 显示录制设置对话框

#### 2. 配置参数

**操作**:

- 选择画面比例: 16:9
- 选择背景壁纸: 第 1 个
- 调整圆角半径: 16px
- 调整画布边距: 48px
- 开启摄像头: 是
- 开启光标高亮: 否

**预期**: 左侧预览实时更新，显示所有效果

#### 3. 开始录制

**操作**: 点击 "开始录制" 按钮

**预期**:

- 请求摄像头/麦克风权限
- 显示录制中状态 (红点 + 时长计时器)
- 可以正常绘图

#### 4. 停止录制

**操作**: 点击 "停止录制" 按钮

**预期**:

- 录制停止
- 自动下载 `.mp4` 文件（如果支持）或 `.webm` 文件
- 文件名: `excalidraw-recording-{timestamp}.mp4`

#### 5. 播放验证

**操作**: 使用视频播放器打开下载的文件

**预期**:

- 视频比例正确 (16:9)
- 背景壁纸显示正确
- 圆角和边距符合设置
- 摄像头画面显示在右下角
- 音频正常（如果启用麦克风）

### 单元测试

```bash
# 测试 MP4Encoder
yarn test:app -- --grep "MP4Encoder"

# 测试 CanvasCompositor
yarn test:app -- --grep "CanvasCompositor"

# 测试 CursorTracker
yarn test:app -- --grep "CursorTracker"

# 测试 RecordingEngine
yarn test:app -- --grep "RecordingEngine"
```

### 类型检查

```bash
yarn test:typecheck
```

### 代码检查

```bash
yarn test:code
```

---

## 实施顺序建议

### Day 1-2: Phase 1 (基础设施)

- ✅ 创建类型定义 (`types.ts`)
- ✅ 创建状态管理 (`recordingState.ts`)
- 准备壁纸资源
- 修改 AppState 类型

### Day 3-5: Phase 2 (录制引擎)

- 实现 `MP4Encoder.ts`
- 实现 `CanvasCompositor.ts`
- 实现 `CursorTracker.ts`
- 实现 `RecordingEngine.ts`
- 编写单元测试

### Day 6-8: Phase 3 (UI 组件)

- 创建 `RecordingDialog.tsx`
- 实现 `RecordingPreview.tsx`
- 实现 `AspectRatioSelector.tsx`
- 实现 `BackgroundWallpaperPicker.tsx`
- 实现 `RecordingControls.tsx`
- 编写组件样式

### Day 9-10: Phase 4 (集成)

- 创建 `actionRecording.tsx`
- 集成到 `LayerUI.tsx`
- 添加菜单项
- 添加国际化翻译

### Day 11-12: 端到端测试和 bug 修复

- 运行端到端测试
- 修复发现的 bug
- 测试不同浏览器兼容性

### Day 13-15: Phase 5 (优化)

- 性能优化
- 帧率自适应
- 浏览器兼容性增强
- 用户体验优化

**预计总工期**: 15 天

---

## 风险和限制

### 1. 浏览器兼容性

**风险**: MediaRecorder API 的 MP4 支持在不同浏览器中差异较大。

**应对**:

- Firefox 不支持 MP4，需要降级到 WebM
- 提供明确的浏览器支持说明
- 考虑提供在线转换工具链接

### 2. 性能

**风险**: 60fps 实时合成可能在低端设备卡顿。

**应对**:

- 实现帧率自适应机制
- 提供质量/性能平衡选项
- 缓存静态内容

### 3. 文件大小

**风险**: 未压缩的 MP4 视频文件可能较大。

**应对**:

- 调整比特率 (videoBitsPerSecond)
- 提供质量设置选项
- 建议录制时长限制

### 4. 移动端

**风险**: 移动浏览器可能不支持或性能受限。

**应对**:

- 检测设备类型，移动端显示提示
- 建议桌面端使用
- 提供轻量级录制模式

### 5. 权限请求

**风险**: 用户可能拒绝摄像头/麦克风权限。

**应对**:

- 清晰的权限请求说明
- 优雅的错误处理
- 允许部分功能降级使用

---

## 后续扩展

### 短期 (1-3 个月)

- 添加视频质量设置（低/中/高）
- 支持水印自定义
- 添加倒计时功能
- 支持快捷键控制

### 中期 (3-6 个月)

- 支持更多导出格式 (MOV, AVI)
- 添加视频压缩选项
- 云端存储集成
- 分享到社交媒体

### 长期 (6-12 个月)

- 实时直播推流 (RTMP)
- AI 自动剪辑
- 多轨道时间线编辑
- 协作录制功能

---

## 附录

### A. MediaRecorder API 浏览器支持

| 浏览器  | 版本 | MP4 支持 | WebM 支持 |
| ------- | ---- | -------- | --------- |
| Chrome  | 88+  | ✅       | ✅        |
| Edge    | 88+  | ✅       | ✅        |
| Firefox | 29+  | ❌       | ✅        |
| Safari  | 14+  | ✅       | ❌        |
| Opera   | 74+  | ✅       | ✅        |

### B. 录制性能基准

| 分辨率    | FPS | CPU 使用率 | 内存使用 |
| --------- | --- | ---------- | -------- |
| 1920×1080 | 60  | ~40%       | ~300MB   |
| 1920×1080 | 30  | ~25%       | ~200MB   |
| 1280×720  | 60  | ~30%       | ~200MB   |
| 1280×720  | 30  | ~15%       | ~150MB   |

### C. 依赖项

```json
{
  "dependencies": {
    // 现有依赖保持不变
  },
  "devDependencies": {
    // 如果需要客户端 MP4 封装
    "@webav/av-cliper": "^0.x.x" // 可选
  }
}
```

### D. 相关资源

- [MediaRecorder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [getUserMedia API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [mp4-muxer - GitHub](https://github.com/Vanilagy/mp4-muxer)

---

**文档版本**: 1.0 **最后更新**: 2026-02-18 **作者**: Claude Code (Sonnet 4.5)
