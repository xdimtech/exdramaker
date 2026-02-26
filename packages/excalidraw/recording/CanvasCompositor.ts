import { exportToCanvas } from "@excalidraw/utils/export";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { getWallpaperById } from "../assets/wallpapers";

import { RECORDING_RESOLUTIONS } from "./types";

import type { BinaryFiles, UIAppState } from "../types";
import type { RecordingConfig } from "./types";

export class CanvasCompositor {
  private static readonly CAMERA_BORDER_WIDTH = 3;
  private offscreenCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wallpaperImage: HTMLImageElement | null = null;
  private cameraVideoElement: HTMLVideoElement | null = null;
  private cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private sourceCanvas: HTMLCanvasElement | null = null;
  private captureArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  private sourceCanvasScale: { x: number; y: number } | null = null;
  private sourceCanvasBounds: DOMRect | null = null;
  private cameraOverlay: {
    sizeRatio: number;
    centerXRatio: number;
    centerYRatio: number;
  } | null = null;
  private captureViewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  constructor(
    private width: number,
    private height: number,
    private elements: readonly NonDeletedExcalidrawElement[],
    private appState: Readonly<UIAppState>,
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
      console.warn(`Wallpaper not found: ${wallpaperId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // 尝试解决 CORS 问题
      img.onload = () => {
        this.wallpaperImage = img;
        resolve();
      };
      img.onerror = (e) => {
        console.error(`Failed to load wallpaper: ${wallpaper.src}`, e);
        // 如果是 CORS 错误，尝试不使用 crossOrigin 重试
        if (img.crossOrigin !== "") {
          img.crossOrigin = "";
          img.src = wallpaper.src;
          return;
        }
        resolve(); // 继续执行，使用降级背景
      };
      img.src = wallpaper.src;
    });
  }

  setCameraStream(stream: MediaStream): void {
    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    this.cameraVideoElement = videoElement;

    // 等待视频加载
    videoElement.play().catch((err) => {
      console.error("Failed to play camera video:", err);
    });
  }

  async waitForCameraReady(timeoutMs: number = 2000): Promise<void> {
    const videoElement = this.cameraVideoElement;
    if (!videoElement) {
      return;
    }

    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      let resolved = false;
      const cleanup = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        videoElement.removeEventListener("loadeddata", handleReady);
        videoElement.removeEventListener("canplay", handleReady);
        videoElement.removeEventListener("canplaythrough", handleReady);
      };
      const handleReady = () => {
        cleanup();
        resolve();
      };
      videoElement.addEventListener("loadeddata", handleReady, { once: true });
      videoElement.addEventListener("canplay", handleReady, { once: true });
      videoElement.addEventListener("canplaythrough", handleReady, {
        once: true,
      });

      window.setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);
    });
  }

  setSourceCanvas(
    canvas: HTMLCanvasElement,
    captureArea?: { x: number; y: number; width: number; height: number },
  ): void {
    this.sourceCanvas = canvas;
    this.captureArea = captureArea || null;
    const bounds = canvas.getBoundingClientRect();
    this.sourceCanvasBounds = bounds;
    if (bounds.width > 0 && bounds.height > 0) {
      this.sourceCanvasScale = {
        x: canvas.width / bounds.width,
        y: canvas.height / bounds.height,
      };
    } else {
      this.sourceCanvasScale = null;
    }
  }

  private drawLaserTrails(ctx: CanvasRenderingContext2D, scale: number): void {
    if (!this.sourceCanvasBounds || !this.sourceCanvasScale) {
      return;
    }

    const svg = document.querySelector(".SVGLayer svg");
    if (!svg) {
      return;
    }

    const paths = svg.querySelectorAll("path");
    if (!paths.length) {
      return;
    }

    const offsetX = this.sourceCanvasBounds.left + (this.captureArea?.x ?? 0);
    const offsetY = this.sourceCanvasBounds.top + (this.captureArea?.y ?? 0);

    ctx.save();
    ctx.scale(
      this.sourceCanvasScale.x * scale,
      this.sourceCanvasScale.y * scale,
    );
    ctx.translate(-offsetX, -offsetY);

    paths.forEach((path) => {
      const d = path.getAttribute("d");
      if (!d) {
        return;
      }

      const fill = path.getAttribute("fill") || path.style.fill;
      const stroke = path.getAttribute("stroke") || path.style.stroke;
      const strokeWidth = parseFloat(path.getAttribute("stroke-width") || "0");
      const path2d = new Path2D(d);

      if (fill && fill !== "none") {
        ctx.fillStyle = fill;
        ctx.fill(path2d);
      }

      if (stroke && stroke !== "none" && strokeWidth > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke(path2d);
      }
    });

    ctx.restore();
  }

  setCameraOverlayPosition(
    overlay: {
      sizeRatio: number;
      centerXRatio: number;
      centerYRatio: number;
    } | null,
  ): void {
    if (!overlay) {
      this.cameraOverlay = null;
      return;
    }
    this.cameraOverlay = {
      sizeRatio: Math.max(overlay.sizeRatio, 0),
      centerXRatio: Math.min(Math.max(overlay.centerXRatio, 0), 1),
      centerYRatio: Math.min(Math.max(overlay.centerYRatio, 0), 1),
    };
  }

  updateCursorPosition(x: number, y: number): void {
    this.cursorPosition = { x, y };
  }

  private async captureExcalidrawCanvas(
    config: RecordingConfig,
  ): Promise<HTMLCanvasElement> {
    // 计算内容区域
    const contentWidth = this.width - config.padding * 2;
    const contentHeight = this.height - config.padding * 2;

    if (this.sourceCanvas && this.captureArea && this.sourceCanvasScale) {
      const { x: scaleX, y: scaleY } = this.sourceCanvasScale;
      const sourceWidth = this.captureArea.width * scaleX;
      const sourceHeight = this.captureArea.height * scaleY;
      const scale = Math.min(
        contentWidth / sourceWidth,
        contentHeight / sourceHeight,
      );

      const canvas = document.createElement("canvas");
      canvas.width = contentWidth;
      canvas.height = contentHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // 绘制并拉伸到内容区域大小
        ctx.drawImage(
          this.sourceCanvas,
          this.captureArea.x * scaleX,
          this.captureArea.y * scaleY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          contentWidth,
          contentHeight,
        );
        this.drawLaserTrails(ctx, scale);
      }
      return canvas;
    }

    // 使用 exportToCanvas 生成画布快照 - 直接使用内容区域尺寸
    const canvas = await exportToCanvas({
      elements: this.elements,
      appState: {
        ...this.appState,
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files: this.files,
      exportPadding: 0,
      getDimensions: () => {
        // 直接使用内容区域的确切尺寸
        return {
          width: contentWidth,
          height: contentHeight,
          scale: 1,
        };
      },
    });

    return canvas;
  }

  private drawCameraOverlay(config: RecordingConfig): void {
    if (!this.cameraVideoElement || this.cameraVideoElement.readyState < 2) {
      return;
    }

    const contentArea = {
      x: config.padding,
      y: config.padding,
      width: this.width - config.padding * 2,
      height: this.height - config.padding * 2,
    };
    const viewport = this.captureViewport || contentArea;
    const viewportWidth = Math.max(1, viewport.width);
    const viewportHeight = Math.max(1, viewport.height);

    let size = Math.min(config.camera.size, viewportWidth, viewportHeight);
    const margin = 24;
    let x = viewport.x + viewportWidth - size - margin;
    let y = viewport.y + viewportHeight - size - margin;

    if (this.cameraOverlay) {
      const rawSize = Math.max(this.cameraOverlay.sizeRatio, 0) * viewportWidth;
      size = Math.min(rawSize, viewportWidth, viewportHeight);
      if (size <= 0) {
        return;
      }
      const halfSize = size / 2;
      const scaledCenterX =
        viewport.x + this.cameraOverlay.centerXRatio * viewportWidth;
      const scaledCenterY =
        viewport.y + this.cameraOverlay.centerYRatio * viewportHeight;
      const minCenterX = viewport.x + halfSize;
      const maxCenterX = viewport.x + viewportWidth - halfSize;
      const minCenterY = viewport.y + halfSize;
      const maxCenterY = viewport.y + viewportHeight - halfSize;
      const clampedCenterX = Math.min(
        Math.max(scaledCenterX, minCenterX),
        Math.max(minCenterX, maxCenterX),
      );
      const clampedCenterY = Math.min(
        Math.max(scaledCenterY, minCenterY),
        Math.max(minCenterY, maxCenterY),
      );
      x = clampedCenterX - halfSize;
      y = clampedCenterY - halfSize;
    }

    const outerRadius = size / 2;
    const borderWidth = CanvasCompositor.CAMERA_BORDER_WIDTH;
    const innerRadius = Math.max(outerRadius - borderWidth, 0);
    const innerDiameter = innerRadius * 2;
    const centerX = x + outerRadius;
    const centerY = y + outerRadius;

    this.ctx.save();
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function") {
      this.ctx.roundRect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
        config.borderRadius,
      );
    } else {
      this.ctx.rect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
      );
    }
    this.ctx.clip();

    // Draw border background
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fill();
    this.ctx.restore();

    if (innerRadius > 0) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      this.ctx.clip();

      // 绘制视频帧 (镜像)
      const videoWidth = this.cameraVideoElement.videoWidth;
      const videoHeight = this.cameraVideoElement.videoHeight;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = videoWidth;
      let sourceHeight = videoHeight;

      if (videoWidth && videoHeight) {
        const videoAspect = videoWidth / videoHeight;
        if (videoAspect > 1) {
          sourceWidth = videoHeight;
          sourceX = (videoWidth - sourceWidth) / 2;
        } else if (videoAspect < 1) {
          sourceHeight = videoWidth;
          sourceY = (videoHeight - sourceHeight) / 2;
        }
      }

      const zoom = Math.max(1, config.camera.zoom || 1);
      if (zoom > 1) {
        const zoomedWidth = sourceWidth / zoom;
        const zoomedHeight = sourceHeight / zoom;
        sourceX += (sourceWidth - zoomedWidth) / 2;
        sourceY += (sourceHeight - zoomedHeight) / 2;
        sourceWidth = zoomedWidth;
        sourceHeight = zoomedHeight;
      }

      this.ctx.translate(centerX + innerRadius, centerY - innerRadius);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        this.cameraVideoElement,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        innerDiameter,
        innerDiameter,
      );
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(
      centerX,
      centerY,
      outerRadius - borderWidth / 2,
      0,
      Math.PI * 2,
    );
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = borderWidth;
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.restore();
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

  private drawFloatingShadow(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const minSize = Math.min(width, height);
    // 增强阴影效果
    const blur = Math.max(40, Math.round(minSize * 0.15));
    const offsetY = Math.max(16, Math.round(minSize * 0.06));
    const safeRadius = Math.max(
      0,
      Math.min(radius, Math.min(width, height) / 2),
    );

    // 绘制多层阴影以增强效果
    this.ctx.save();
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = offsetY;
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function" && safeRadius > 0) {
      this.ctx.roundRect(x, y, width, height, safeRadius);
    } else {
      this.ctx.rect(x, y, width, height);
    }
    this.ctx.fill();
    this.ctx.restore();

    // 第二层阴影
    this.ctx.save();
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    this.ctx.shadowBlur = Math.round(blur * 0.6);
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = Math.round(offsetY * 0.7);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function" && safeRadius > 0) {
      this.ctx.roundRect(x, y, width, height, safeRadius);
    } else {
      this.ctx.rect(x, y, width, height);
    }
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawWatermark(config: RecordingConfig): void {
    const text = "姜无维AI进化论";
    const fontSize = Math.max(16, Math.round(this.width * 0.02));
    const margin = Math.max(24, config.padding + 8);
    this.ctx.save();
    this.ctx.font = `${fontSize}px "Inter", "PingFang SC", sans-serif`;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    this.ctx.textBaseline = "bottom";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.width / 2, this.height - margin);
    this.ctx.restore();
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

    // 3. 绘制悬浮阴影 - 在白色背景下方
    const shadowOffset = 24; // 阴影向下偏移
    const shadowBlur = 40; // 阴影模糊程度

    // 绘制阴影层
    this.ctx.save();
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    this.ctx.shadowBlur = shadowBlur;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = shadowOffset;

    // 绘制白色背景（带圆角），这会同时产生阴影
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function") {
      this.ctx.roundRect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
        config.borderRadius,
      );
    } else {
      this.ctx.rect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
      );
    }
    this.ctx.fill();
    this.ctx.restore();

    // 4. 绘制白色画布边框
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function") {
      this.ctx.roundRect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
        config.borderRadius,
      );
    } else {
      this.ctx.rect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
      );
    }
    this.ctx.stroke();
    this.ctx.restore();

    // 5. 应用圆角蒙版
    this.ctx.save();
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === "function") {
      this.ctx.roundRect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
        config.borderRadius,
      );
    } else {
      this.ctx.rect(
        contentArea.x,
        contentArea.y,
        contentArea.width,
        contentArea.height,
      );
    }
    this.ctx.clip();

    // 6. 绘制 Excalidraw 画布 - 填充整个内容区域
    const excalidrawCanvas = await this.captureExcalidrawCanvas(config);

    // 填充绘制（不再居中，直接填充整个内容区域）
    this.captureViewport = {
      x: contentArea.x,
      y: contentArea.y,
      width: contentArea.width,
      height: contentArea.height,
    };

    this.ctx.drawImage(
      excalidrawCanvas,
      contentArea.x,
      contentArea.y,
      contentArea.width,
      contentArea.height,
    );

    this.ctx.restore();

    // 7. 叠加摄像头 (如果启用)
    if (config.camera.enabled && this.cameraVideoElement) {
      this.drawCameraOverlay(config);
    }

    // 8. 绘制光标高亮 (如果启用)
    if (config.cursor.enabled) {
      this.drawCursorHighlight(config.cursor.color);
    }

    this.drawWatermark(config);
  }

  getCanvas(): HTMLCanvasElement {
    return this.offscreenCanvas;
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
    this.captureViewport = null;
  }
}
