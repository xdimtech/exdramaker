import React, { useEffect, useRef, useState } from "react";

import { useAtom, useSetAtom, useAtomValue } from "../../editor-jotai";
import {
  recordingOverlayAtom,
  recordingStatusAtom,
  recordingDurationAtom,
  recordingEngineAtom,
  recordingBlobAtom,
  recordingStartRequestAtom,
  teleprompterConfigAtom,
  recordingAreaPositionAtom,
} from "../../recording/recordingState";
import {
  slidesAtom,
  activeSlideIdAtom,
  focusedSlideIdAtom,
  scrollTargetAtom,
  isRecordingAtom,
  recordingAreaSizeAtom,
} from "../../editor-jotai";
import { recordingConfigAtom } from "../../recording/recordingState";
import { RECORDING_RESOLUTIONS } from "../../recording/types";
import { useExcalidrawSetAppState } from "../App";
import { t } from "../../i18n";
import { settingsIcon, file } from "../icons";

import "./RecordingToolbar.scss";

const formatDuration = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const RecordingToolbar = () => {
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const setAppState = useExcalidrawSetAppState();

  const [teleprompterConfig, setTeleprompterConfig] = useAtom(
    teleprompterConfigAtom,
  );
  const [isOpen, setIsOpen] = useAtom(recordingOverlayAtom);
  const [status, setStatus] = useAtom(recordingStatusAtom);
  const [duration] = useAtom(recordingDurationAtom);
  const [engine, setEngine] = useAtom(recordingEngineAtom);
  const setBlob = useSetAtom(recordingBlobAtom);
  const setDuration = useSetAtom(recordingDurationAtom);
  const setStartRequest = useSetAtom(recordingStartRequestAtom);

  // Slide-related atoms
  const slides = useAtomValue(slidesAtom);
  const setActiveSlideIdAtom = useSetAtom(activeSlideIdAtom);
  const setFocusedSlideIdAtom = useSetAtom(focusedSlideIdAtom);
  const setScrollTargetAtom = useSetAtom(scrollTargetAtom);
  const setSlidesAtom = useSetAtom(slidesAtom);
  const setIsRecording = useSetAtom(isRecordingAtom);
  const setRecordingAreaSize = useSetAtom(recordingAreaSizeAtom);
  const [recordingConfig] = useAtom(recordingConfigAtom);
  const recordingAreaPosition = useAtomValue(recordingAreaPositionAtom);

  // Track if slides have been positioned for current recording area
  const positionedRef = useRef<string | null>(null);

  // When entering pre-recording and recording area is available, move slides to recording area
  useEffect(() => {
    if (
      status === "pre-recording" &&
      recordingAreaPosition &&
      slides.length > 0
    ) {
      // Skip if already positioned for this recording area
      const areaKey = `${recordingAreaPosition.x}-${recordingAreaPosition.y}`;
      if (positionedRef.current === areaKey) {
        return;
      }
      positionedRef.current = areaKey;

      const firstSlide = slides[0];

      // Calculate zoom from config (not from recordingAreaPosition which may have wrong zoom)
      const resolution =
        RECORDING_RESOLUTIONS[
          recordingConfig.aspectRatio as keyof typeof RECORDING_RESOLUTIONS
        ] || RECORDING_RESOLUTIONS["9:16"];
      const configWidth = resolution.width;
      const configHeight = resolution.height;

      // Calculate expected recording area size based on window
      // On mobile, use 100% width; on desktop, use 80%
      const isMobile = window.innerWidth <= 768;
      const widthRatio = isMobile ? 1.0 : 0.8;
      const heightRatio = isMobile ? 1.0 : 0.8;

      const aspectRatio = configWidth / configHeight;
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
        "[RecordingToolbar useEffect] status: pre-recording, zoom from config:",
        zoom,
        "isMobile:",
        isMobile,
        "widthRatio:",
        widthRatio,
        "areaW:",
        areaW,
        "firstSlide.width:",
        firstSlide.width,
      );

      // Set zoom and scroll to 0
      window.dispatchEvent(
        new CustomEvent("excalidraw-recording-setup", {
          detail: { zoom, scrollX: 0, scrollY: 0 },
        }),
      );

      // Position slide at TOP-LEFT of recording area
      // recordingAreaPosition is in screen coords, need to convert to canvas coords
      // CanvasSlides: left = (slide.x + scrollX) * zoom
      // So: slide.x = recordingArea.x / zoom
      const targetSlideX = recordingAreaPosition.x / zoom;
      const targetSlideY = recordingAreaPosition.y / zoom;

      console.log(
        "[RecordingToolbar] targetSlideX:",
        targetSlideX,
        "targetSlideY:",
        targetSlideY,
      );

      // Calculate offset from current position to target position
      const currentSlideX = firstSlide.x || 0;
      const currentSlideY = firstSlide.y || 0;
      const offsetX = targetSlideX - currentSlideX;
      const offsetY = targetSlideY - currentSlideY;

      setSlidesAtom((prevSlides) =>
        prevSlides.map((slide) => ({
          ...slide,
          x: (slide.x || 0) + offsetX,
          y: (slide.y || 0) + offsetY,
        })),
      );

      setActiveSlideIdAtom(firstSlide.id);
      setFocusedSlideIdAtom(firstSlide.id);
    }
  }, [status, recordingAreaPosition, slides]);

  useEffect(() => {
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? 240;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
      const isMobile = window.innerWidth <= 768;

      console.log("[RecordingToolbar] Initializing position:", {
        toolbarWidth,
        toolbarHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        isMobile,
      });

      // Center horizontally
      const initialX = (window.innerWidth - toolbarWidth) / 2;
      // Mobile: top, Desktop: bottom
      const initialY = isMobile
        ? 24 // Top on mobile
        : window.innerHeight - toolbarHeight - 24; // Bottom on desktop

      console.log("[RecordingToolbar] Calculated position:", {
        initialX,
        initialY,
      });

      setToolbarPosition({
        x: Math.max(8, initialX),
        y: Math.max(8, initialY),
      });
    }, 100);

    // Handle window resize (important for mobile when address bar shows/hides)
    const handleResize = () => {
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? 240;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
      const isMobile = window.innerWidth <= 768;

      setToolbarPosition((prev) => {
        // Re-center if still near center (horizontally)
        const isNearCenter =
          Math.abs(prev.x - (window.innerWidth - toolbarWidth) / 2) < 50;
        const isNearTop = prev.y < 100;
        const isNearBottom = prev.y > window.innerHeight - toolbarHeight - 100;

        // If near center and appropriate vertical position for current mode
        if (
          isNearCenter &&
          ((isMobile && isNearTop) || (!isMobile && isNearBottom))
        ) {
          const newY = isMobile ? 24 : window.innerHeight - toolbarHeight - 24;
          return {
            x: Math.max(8, (window.innerWidth - toolbarWidth) / 2),
            y: Math.max(8, newY),
          };
        }

        // Otherwise just ensure it's within bounds
        return {
          x: Math.max(
            8,
            Math.min(window.innerWidth - toolbarWidth - 8, prev.x),
          ),
          y: Math.max(
            8,
            Math.min(window.innerHeight - toolbarHeight - 8, prev.y),
          ),
        };
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!isDragging || !dragOffsetRef.current) {
        return;
      }
      const x = event.clientX - dragOffsetRef.current.x;
      const y = event.clientY - dragOffsetRef.current.y;
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? 220;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
      setToolbarPosition({
        x: Math.max(16, Math.min(window.innerWidth - toolbarWidth - 16, x)),
        y: Math.max(16, Math.min(window.innerHeight - toolbarHeight - 16, y)),
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      dragOffsetRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging]);

  // 确保工具栏不会超出屏幕边界（当尺寸变化时）
  useEffect(() => {
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 220;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
    setToolbarPosition((prev) => ({
      x: Math.min(prev.x, window.innerWidth - toolbarWidth - 16),
      y: Math.min(prev.y, window.innerHeight - toolbarHeight - 16),
    }));
  }, [status]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    dragOffsetRef.current = {
      x: event.clientX - toolbarPosition.x,
      y: event.clientY - toolbarPosition.y,
    };
    setIsDragging(true);
  };

  const handleOpenSettings = () => {
    setAppState({ openDialog: { name: "recording" } });
  };

  const handleToggleTeleprompter = () => {
    setTeleprompterConfig({
      ...teleprompterConfig,
      visible: !teleprompterConfig.visible,
    });
  };

  // ── State machine handlers ───────────────────────────────────────────────

  // Idle → Pre-recording: open overlay for positioning
  // Slides positioning is handled by useEffect when recordingAreaPosition is available
  const handleClickRecord = () => {
    // Reset positionedRef so slides will be repositioned
    positionedRef.current = null;
    // 关闭录制设置弹框
    setAppState({ openDialog: null });
    setStatus("pre-recording");
    setIsOpen(true);
  };

  // Pre-recording → Idle: abort
  const handleCancel = () => {
    setStatus("idle");
    setIsOpen(false);
  };

  // Pre-recording → Recording: signal overlay to start engine
  const handleBegin = () => {
    console.log(
      "[RecordingToolbar handleBegin] called, slides.length:",
      slides.length,
    );
    // 关闭录制设置弹框
    setAppState({ openDialog: null });

    // Handle slide setup for recording
    if (slides.length > 0) {
      // Get recording resolution from config
      const resolution =
        RECORDING_RESOLUTIONS[
          recordingConfig.aspectRatio as keyof typeof RECORDING_RESOLUTIONS
        ] || RECORDING_RESOLUTIONS["9:16"];
      const recordingWidth = resolution.width;
      const recordingHeight = resolution.height;

      setRecordingAreaSize({ width: recordingWidth, height: recordingHeight });
      setIsRecording(true);

      // Focus on first slide
      const firstSlide = slides[0];
      setActiveSlideIdAtom(firstSlide.id);
      setFocusedSlideIdAtom(firstSlide.id);
    }

    setStartRequest((n) => n + 1);
  };

  // Recording → Paused
  const handlePause = () => {
    if (engine) {
      engine.pauseRecording();
      setStatus("paused");
    }
  };

  // Paused → Recording
  const handleResume = () => {
    if (engine) {
      engine.resumeRecording();
      setStatus("recording");
    }
  };

  // Recording/Paused → Idle: stop and download
  const handleStop = async () => {
    if (!engine) {
      return;
    }
    try {
      const blob = await engine.stopRecording();
      setBlob(blob);
      if ((engine as any).timer) {
        clearInterval((engine as any).timer);
      }
      await engine.downloadRecording(blob);
    } catch (err) {
      console.error("Failed to stop recording:", err);
    } finally {
      setEngine(null);
      setStatus("idle");
      setIsOpen(false);
      setDuration(0);
    }
  };

  const isRecordingActive = status === "recording" || status === "paused";
  const isSettingsDisabled = status !== "idle";

  // Debug: calculate recording area in window coordinates
  const recordingAreaInWindow = recordingAreaPosition
    ? {
        x: recordingAreaPosition.x,
        y: recordingAreaPosition.y,
        width: recordingAreaPosition.width,
        height: recordingAreaPosition.height,
      }
    : null;

  // Calculate expected zoom (same logic as pre-recording setup)
  const configRes =
    RECORDING_RESOLUTIONS[
      recordingConfig.aspectRatio as keyof typeof RECORDING_RESOLUTIONS
    ] || RECORDING_RESOLUTIONS["9:16"];
  const configWidth = configRes.width;
  const configHeight = configRes.height;
  const aspectRatio = configWidth / configHeight;

  // Use same ratio as RecordingOverlay
  const isMobileDebug = window.innerWidth <= 768;
  const widthRatioDebug = isMobileDebug ? 1.0 : 0.8;
  const heightRatioDebug = isMobileDebug ? 1.0 : 0.8;

  const maxW = window.innerWidth * widthRatioDebug;
  const maxH = window.innerHeight * heightRatioDebug;
  let areaWDebug = maxW;
  let areaHDebug = areaWDebug / aspectRatio;
  if (areaHDebug > maxH) {
    areaHDebug = maxH;
    areaWDebug = areaHDebug * aspectRatio;
  }
  const zoom = slides.length > 0 ? areaWDebug / (slides[0]?.width || 300) : 1;

  // Calculate scroll position that would result from target
  // Use actual slide position after moving to recording area
  const slideCenterX =
    slides.length > 0 ? (slides[0].x || 0) + slides[0].width / 2 : 0;
  const slideCenterY =
    slides.length > 0 ? (slides[0].y || 0) + slides[0].height / 2 : 0;
  const scrollX = slideCenterX * zoom - window.innerWidth / 2;
  const scrollY = slideCenterY * zoom - window.innerHeight / 2;

  // Build debug info string
  const debugInfo = `Zoom: ${zoom.toFixed(2)}
Window: ${window.innerWidth} x ${window.innerHeight}
Window Center: (${window.innerWidth / 2}, ${window.innerHeight / 2})
Slide Center: (${slideCenterX.toFixed(1)}, ${slideCenterY.toFixed(1)})
Expected Scroll: (${Math.round(scrollX)}, ${Math.round(scrollY)})
Recording Area Center: (${
    recordingAreaInWindow
      ? (recordingAreaInWindow.x + recordingAreaInWindow.width / 2).toFixed(1)
      : "N/A"
  }, ${
    recordingAreaInWindow
      ? (recordingAreaInWindow.y + recordingAreaInWindow.height / 2).toFixed(1)
      : "N/A"
  })
${
  recordingAreaInWindow
    ? `Recording Area: x=${Math.round(recordingAreaInWindow.x)}, y=${Math.round(
        recordingAreaInWindow.y,
      )}, ${Math.round(recordingAreaInWindow.width)}x${Math.round(
        recordingAreaInWindow.height,
      )}`
    : ""
}
Slides:
${slides
  .map(
    (s, i) =>
      `Slide ${i + 1}: x=${Math.round(s.x || 0)}, y=${Math.round(s.y || 0)}, ${
        s.width
      }x${s.height}`,
  )
  .join("\n")}`;

  const handleCopyDebug = () => {
    navigator.clipboard.writeText(debugInfo);
    alert("Debug info copied!");
  };

  return (
    <>
      {/* Toolbar position debug (always visible on mobile) */}
      {window.innerWidth <= 768 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            background: "rgba(255, 0, 0, 0.8)",
            color: "#fff",
            padding: "4px 8px",
            fontSize: "10px",
            zIndex: 10000,
            fontFamily: "monospace",
          }}
        >
          Toolbar: {Math.round(toolbarPosition.x)},{" "}
          {Math.round(toolbarPosition.y)}
          <br />
          Window: {window.innerWidth} x {window.innerHeight}
        </div>
      )}
      {/* Debug Info Panel */}
      {isOpen && slides.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            background: "rgba(0,0,0,0.8)",
            color: "#0f0",
            padding: "10px",
            fontSize: "12px",
            fontFamily: "monospace",
            zIndex: 9999,
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              marginBottom: "8px",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Debug Info</span>
            <button
              onClick={handleCopyDebug}
              style={{
                background: "#444",
                color: "#fff",
                border: "none",
                padding: "2px 8px",
                fontSize: "10px",
                cursor: "pointer",
                borderRadius: "3px",
              }}
            >
              Copy
            </button>
          </div>
          <div>Zoom: {zoom.toFixed(2)}</div>
          <div>
            Window: {window.innerWidth} x {window.innerHeight}
          </div>
          <div>
            Window Center: ({window.innerWidth / 2}, {window.innerHeight / 2})
          </div>
          <div style={{ marginTop: "4px" }}>
            Target: ({slides[0]?.width / 2}, {slides[0]?.height / 2})
          </div>
          <div>
            Scroll will be: ({Math.round(scrollX)}, {Math.round(scrollY)})
          </div>
          {recordingAreaInWindow && (
            <>
              <div style={{ marginTop: "8px" }}>
                Recording Area (canvas coords):
              </div>
              <div>
                x: {Math.round(recordingAreaInWindow.x)}, y:{" "}
                {Math.round(recordingAreaInWindow.y)}
              </div>
              <div>
                width: {Math.round(recordingAreaInWindow.width)}, height:{" "}
                {Math.round(recordingAreaInWindow.height)}
              </div>
              <div>
                center: (
                {Math.round(
                  recordingAreaInWindow.x + recordingAreaInWindow.width / 2,
                )}
                ,{" "}
                {Math.round(
                  recordingAreaInWindow.y + recordingAreaInWindow.height / 2,
                )}
                )
              </div>
            </>
          )}
          <div style={{ marginTop: "8px" }}>Slides:</div>
          {slides.map((slide, idx) => (
            <div key={slide.id}>
              Slide {idx + 1}: x={Math.round(slide.x || 0)}, y=
              {Math.round(slide.y || 0)}, {slide.width}x{slide.height}
            </div>
          ))}
        </div>
      )}
      <div
        ref={toolbarRef}
        className={`RecordingToolbar ${
          isDragging ? "RecordingToolbar--dragging" : ""
        }`}
        style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
        onPointerDown={handlePointerDown}
      >
        {/* Settings — disabled while recording */}
        <button
          type="button"
          className={`RecordingToolbar__icon-button ${
            isSettingsDisabled ? "RecordingToolbar__icon-button--disabled" : ""
          }`}
          onClick={isSettingsDisabled ? undefined : handleOpenSettings}
          disabled={isSettingsDisabled}
          title={t("recording.settings" as any)}
        >
          {settingsIcon}
        </button>

        {/* Teleprompter toggle */}
        <button
          type="button"
          className={`RecordingToolbar__icon-button ${
            teleprompterConfig.visible
              ? "RecordingToolbar__icon-button--active"
              : ""
          }`}
          onClick={handleToggleTeleprompter}
          title={t("recording.teleprompter.title" as any)}
        >
          {file}
        </button>

        {/* ── Idle: show record button ── */}
        {status === "idle" && (
          <button
            type="button"
            className="RecordingToolbar__record-button"
            onClick={handleClickRecord}
          >
            <span className="RecordingToolbar__record-dot" />
            {t("recording.record" as any)}
          </button>
        )}

        {/* ── Pre-recording: show cancel + begin ── */}
        {status === "pre-recording" && (
          <>
            <button
              type="button"
              className="RecordingToolbar__cancel-button"
              onClick={handleCancel}
            >
              {t("buttons.cancel")}
            </button>
            <button
              type="button"
              className="RecordingToolbar__begin-button"
              onClick={handleBegin}
            >
              <span className="RecordingToolbar__record-dot" />
              {t("recording.begin" as any)}
            </button>
          </>
        )}

        {/* ── Recording / Paused: show timer + pause/resume + stop ── */}
        {isRecordingActive && (
          <>
            <span
              className={`RecordingToolbar__timer ${
                status === "recording" ? "RecordingToolbar__timer--active" : ""
              }`}
            >
              {formatDuration(duration)}
            </span>
            <button
              type="button"
              className="RecordingToolbar__action-button"
              onClick={status === "recording" ? handlePause : handleResume}
            >
              {status === "recording"
                ? t("recording.pauseRecording" as any)
                : t("recording.resumeRecording" as any)}
            </button>
            <button
              type="button"
              className="RecordingToolbar__stop-button"
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={handleStop}
            >
              {t("recording.stop" as any)}
            </button>
          </>
        )}
      </div>
    </>
  );
};
