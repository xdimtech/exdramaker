import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { RECORDING_RESOLUTIONS } from "./types";
import { CanvasCompositor } from "./CanvasCompositor";
import { CursorTracker } from "./CursorTracker";
import { MP4Encoder } from "./MP4Encoder";

import type { RecordingConfig } from "./types";
import type { BinaryFiles, UIAppState } from "../types";

export class RecordingEngine {
  private compositor: CanvasCompositor;
  private cursorTracker: CursorTracker;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;
  private cameraStream: MediaStream | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private microphoneSourceNode: MediaStreamAudioSourceNode | null = null;
  private startTime: number = 0;
  private mimeType: string = "";

  constructor(
    private config: RecordingConfig,
    private elements: readonly NonDeletedExcalidrawElement[],
    private appState: Readonly<UIAppState>,
    private files: BinaryFiles,
    private canvas: HTMLCanvasElement,
    private captureArea?: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    private cameraOverlay?: {
      sizeRatio: number;
      centerXRatio: number;
      centerYRatio: number;
    },
  ) {
    const resolution =
      config.aspectRatio === "custom" && config.customAspectRatio
        ? config.customAspectRatio
        : RECORDING_RESOLUTIONS[
            config.aspectRatio as Exclude<typeof config.aspectRatio, "custom">
          ];

    this.compositor = new CanvasCompositor(
      resolution.width,
      resolution.height,
      elements,
      appState,
      files,
    );
    this.compositor.setSourceCanvas(this.canvas, this.captureArea);
    if (this.cameraOverlay) {
      this.compositor.setCameraOverlayPosition(this.cameraOverlay);
    }
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
        await this.compositor.waitForCameraReady();
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

        if (typeof AudioContext !== "undefined") {
          this.audioContext = new AudioContext();
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume().catch(() => undefined);
          }
          this.audioDestination = this.audioContext.createMediaStreamDestination();
          this.microphoneSourceNode = this.audioContext.createMediaStreamSource(
            this.microphoneStream,
          );
          this.microphoneSourceNode.connect(this.audioDestination);
        }
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
    const renderFrame = async () => {
      if (this.config.cursor.enabled) {
        const cursorPos = this.cursorTracker.getPosition();
        this.compositor.updateCursorPosition(cursorPos.x, cursorPos.y);
      }
      await this.compositor.composeFrame(this.config);
    };

    await renderFrame();

    const composeLoop = async () => {
      await renderFrame();
      this.animationFrameId = requestAnimationFrame(composeLoop);
    };

    void composeLoop();

    const videoStream = this.compositor.getStream(60);

    // 3. 合并音频流（如果有）
    const audioTracks =
      this.audioDestination?.stream.getAudioTracks() ||
      this.microphoneStream?.getAudioTracks() ||
      [];

    let finalStream = videoStream;
    if (audioTracks.length) {
      finalStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks,
      ]);
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
        if (this.config.cursor.enabled) {
          const cursorPos = this.cursorTracker.getPosition();
          this.compositor.updateCursorPosition(cursorPos.x, cursorPos.y);
        }
        await this.compositor.composeFrame(this.config);
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
    if (this.startTime === 0) {
      return 0;
    }
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

    if (this.microphoneSourceNode) {
      this.microphoneSourceNode.disconnect();
      this.microphoneSourceNode = null;
    }
    if (this.audioDestination) {
      this.audioDestination.disconnect();
      this.audioDestination = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => null);
      this.audioContext = null;
    }

    // 清理合成器
    this.compositor.cleanup();
  }
}
