import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { useAtom, useSetAtom } from "../../editor-jotai";
import {
  recordingConfigAtom,
  recordingStatusAtom,
  recordingDurationAtom,
  recordingBlobAtom,
  recordingOverlayAtom,
  recordingEngineAtom,
  recordingStartRequestAtom,
  recordingAreaPositionAtom,
} from "../../recording/recordingState";
import { RecordingEngine } from "../../recording/RecordingEngine";

import type { BinaryFiles, UIAppState } from "../../types";

import "./RecordingOverlay.scss";

type RecordingOverlayProps = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Readonly<UIAppState>;
  files: BinaryFiles;
};

const getCanvas = () =>
  (document.querySelector("canvas.excalidraw__canvas.static") ||
    document.querySelector("canvas.excalidraw__canvas.interactive") ||
    document.querySelector(
      "canvas.excalidraw__canvas",
    )) as HTMLCanvasElement | null;

export const RecordingOverlay = ({
  elements,
  appState,
  files,
}: RecordingOverlayProps) => {
  const [isOpen, setIsOpen] = useAtom(recordingOverlayAtom);
  const [config] = useAtom(recordingConfigAtom);
  const [status, setStatus] = useAtom(recordingStatusAtom);
  const setDuration = useSetAtom(recordingDurationAtom);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setBlob = useSetAtom(recordingBlobAtom);
  const [engine, setEngine] = useAtom(recordingEngineAtom);
  const [startRequest] = useAtom(recordingStartRequestAtom);
  const setRecordingAreaPosition = useSetAtom(recordingAreaPositionAtom);

  const [canvasBounds, setCanvasBounds] = useState<DOMRect | null>(null);
  const [recordingArea, setRecordingArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cameraPosition, setCameraPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [interaction, setInteraction] = useState<null | {
    type: "move" | "resize" | "camera";
    handle?: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startArea: { x: number; y: number; width: number; height: number };
    startCamera?: { x: number; y: number };
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraPadding = 0;

  const aspectRatio = useMemo(() => {
    if (config.aspectRatio === "custom" && config.customAspectRatio) {
      return config.customAspectRatio.width / config.customAspectRatio.height;
    }
    if (config.aspectRatio === "custom") {
      return 16 / 9;
    }
    const [width, height] = config.aspectRatio.split(":").map(Number);
    return width && height ? width / height : 16 / 9;
  }, [config.aspectRatio, config.customAspectRatio]);

  useEffect(() => {
    if (!isOpen) {
      setRecordingArea(null);
      setCameraPosition(null);
      setInteraction(null);
      setError(null);
      return;
    }

    const updateBounds = () => {
      const canvas = getCanvas();
      if (!canvas) {
        setError("Canvas not found");
        setIsOpen(false);
        return;
      }
      setCanvasBounds(canvas.getBoundingClientRect());
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (!isOpen || !canvasBounds) {
      return;
    }

    setRecordingArea((prev) => {
      const maxWidth = canvasBounds.width * 0.8;
      const maxHeight = canvasBounds.height * 0.8;
      let width = prev?.width ?? maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      width = Math.min(width, canvasBounds.width);
      height = Math.min(height, canvasBounds.height);

      const centerX = prev ? prev.x + prev.width / 2 : canvasBounds.width / 2;
      const centerY = prev ? prev.y + prev.height / 2 : canvasBounds.height / 2;

      const x = Math.min(
        Math.max(centerX - width / 2, 0),
        canvasBounds.width - width,
      );
      const y = Math.min(
        Math.max(centerY - height / 2, 0),
        canvasBounds.height - height,
      );

      return { x, y, width, height };
    });
  }, [isOpen, canvasBounds, aspectRatio]);

  // Sync recording area to atom for use by RecordingToolbar
  // Store raw values (screen coordinates relative to canvas)
  useEffect(() => {
    if (recordingArea) {
      setRecordingAreaPosition(recordingArea);
    } else {
      setRecordingAreaPosition(null);
    }
  }, [recordingArea, setRecordingAreaPosition]);

  useEffect(() => {
    if (!isOpen || !config.camera.enabled) {
      return;
    }

    let isMounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch((err) => {
        console.error("Failed to get camera preview:", err);
      });

    return () => {
      isMounted = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [isOpen, config.camera.enabled]);

  const cameraSize = useMemo(() => {
    const baseSize = config.camera.size;
    if (!recordingArea) {
      return baseSize;
    }
    const maxWidth = recordingArea.width * 0.5;
    const maxHeight = recordingArea.height * 0.5;
    const maxSize = Math.min(maxWidth, maxHeight);
    return Math.min(baseSize, maxSize);
  }, [recordingArea, config.camera.size]);

  const clampCameraPosition = (
    position: { x: number; y: number },
    area: { x: number; y: number; width: number; height: number },
  ) => {
    const minX = cameraPadding;
    const minY = cameraPadding;
    const maxX = Math.max(minX, area.width - cameraSize - cameraPadding);
    const maxY = Math.max(minY, area.height - cameraSize - cameraPadding);
    return {
      x: Math.min(Math.max(position.x, minX), maxX),
      y: Math.min(Math.max(position.y, minY), maxY),
    };
  };

  useEffect(() => {
    if (!recordingArea) {
      return;
    }
    setCameraPosition((prev) => {
      if (!prev) {
        return {
          x: Math.max(recordingArea.width - cameraSize - cameraPadding, 0),
          y: Math.max(recordingArea.height - cameraSize - cameraPadding, 0),
        };
      }
      return clampCameraPosition(prev, recordingArea);
    });
  }, [recordingArea, cameraSize]);

  useEffect(() => {
    if (!interaction || !canvasBounds || !recordingArea) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!interaction) {
        return;
      }

      const offsetX = event.clientX - interaction.startX;
      const offsetY = event.clientY - interaction.startY;

      if (interaction.type === "move") {
        const newX = Math.min(
          Math.max(interaction.startArea.x + offsetX, 0),
          canvasBounds.width - interaction.startArea.width,
        );
        const newY = Math.min(
          Math.max(interaction.startArea.y + offsetY, 0),
          canvasBounds.height - interaction.startArea.height,
        );
        setRecordingArea({
          ...interaction.startArea,
          x: newX,
          y: newY,
        });
        return;
      }

      if (
        interaction.type === "camera" &&
        interaction.startCamera &&
        recordingArea
      ) {
        const proposed = {
          x: interaction.startCamera.x + offsetX,
          y: interaction.startCamera.y + offsetY,
        };
        setCameraPosition(clampCameraPosition(proposed, recordingArea));
        return;
      }

      if (interaction.type === "resize" && interaction.handle) {
        const handle = interaction.handle;
        const minWidth = 240;
        const minHeight = minWidth / aspectRatio;
        const signX = handle.includes("e") ? 1 : -1;
        const signY = handle.includes("s") ? 1 : -1;

        const widthFromX = interaction.startArea.width + offsetX * signX;
        const heightFromX = widthFromX / aspectRatio;

        const heightFromY = interaction.startArea.height + offsetY * signY;
        const widthFromY = heightFromY * aspectRatio;

        let width = widthFromX;
        let height = heightFromX;

        if (Math.abs(offsetY) * aspectRatio > Math.abs(offsetX)) {
          width = widthFromY;
          height = heightFromY;
        }

        width = Math.max(width, minWidth);
        height = Math.max(height, minHeight);

        width = Math.min(width, canvasBounds.width);
        height = Math.min(height, canvasBounds.height);

        let x = interaction.startArea.x;
        let y = interaction.startArea.y;

        if (handle.includes("w")) {
          x = interaction.startArea.x + (interaction.startArea.width - width);
        }
        if (handle.includes("n")) {
          y = interaction.startArea.y + (interaction.startArea.height - height);
        }

        x = Math.min(Math.max(x, 0), canvasBounds.width - width);
        y = Math.min(Math.max(y, 0), canvasBounds.height - height);

        setRecordingArea({ x, y, width, height });
      }
    };

    const handlePointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interaction, canvasBounds, recordingArea, aspectRatio]);

  // ── Start recording when toolbar signals ─────────────────────────────────

  // Keep a stable ref so the effect below can always call the latest version
  // without needing it in its dependency array (avoids re-subscribing on every render).
  const handleStartRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleStartRecording = async () => {
    if (!recordingArea) {
      setError("Canvas not found");
      return;
    }

    try {
      setError(null);
      const canvas = getCanvas();
      if (!canvas) {
        throw new Error("Canvas not found");
      }

      const cameraOverlay = cameraPosition
        ? {
            sizeRatio: cameraSize / recordingArea.width,
            centerXRatio:
              (cameraPosition.x + cameraSize / 2) / recordingArea.width,
            centerYRatio:
              (cameraPosition.y + cameraSize / 2) / recordingArea.height,
          }
        : undefined;

      const newEngine = new RecordingEngine(
        config,
        elements,
        appState,
        files,
        canvas,
        recordingArea,
        cameraOverlay,
      );

      await newEngine.initialize();
      await newEngine.startRecording();

      setEngine(newEngine);
      setStatus("recording");

      const timer = setInterval(() => {
        setDuration(newEngine.getDuration());
      }, 1000);

      (newEngine as any).timer = timer;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "录制启动失败");
    }
  };

  // Update the ref each render so the effect below always has the latest closure
  handleStartRecordingRef.current = handleStartRecording;

  // Fire when toolbar increments the start request (value > 0 means a real request)
  useEffect(() => {
    if (startRequest === 0) {
      return;
    }
    void handleStartRecordingRef.current();
    // Only react to counter changes — intentionally omitting handleStartRecordingRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRequest]);

  // Clean up engine if overlay is forcibly closed while recording
  useEffect(() => {
    if (!isOpen && engine) {
      if ((engine as any).timer) {
        clearInterval((engine as any).timer);
      }
      setEngine(null);
    }
  }, [isOpen]);

  if (!isOpen || !canvasBounds || !recordingArea) {
    return null;
  }

  const handleFramePointerDown = (event: React.PointerEvent) => {
    if (status !== "idle" && status !== "pre-recording") {
      return;
    }
    event.preventDefault();
    const target = event.target as HTMLElement;
    const handle = target.dataset.handle as
      | "nw"
      | "ne"
      | "sw"
      | "se"
      | undefined;
    if (handle) {
      event.stopPropagation();
      setInteraction({
        type: "resize",
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startArea: recordingArea,
      });
      return;
    }

    if (target.closest(".RecordingOverlay__camera")) {
      return;
    }

    setInteraction({
      type: "move",
      startX: event.clientX,
      startY: event.clientY,
      startArea: recordingArea,
    });
  };

  const handleCameraPointerDown = (event: React.PointerEvent) => {
    if ((status !== "idle" && status !== "pre-recording") || !cameraPosition) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setInteraction({
      type: "camera",
      startX: event.clientX,
      startY: event.clientY,
      startArea: recordingArea,
      startCamera: cameraPosition,
    });
  };

  const isRecordingActive = status === "recording" || status === "paused";

  const overlay = (
    <div
      className={`RecordingOverlay ${
        isRecordingActive ? "RecordingOverlay--locked" : ""
      }`}
    >
      <div
        className="RecordingOverlay__frame"
        style={{
          left: canvasBounds.left + recordingArea.x,
          top: canvasBounds.top + recordingArea.y,
          width: recordingArea.width,
          height: recordingArea.height,
        }}
        onPointerDown={handleFramePointerDown}
      >
        {/* Drag hint — only visible while positioning */}
        {(status === "idle" || status === "pre-recording") && (
          <>
            <div className="RecordingOverlay__hint">
              可拖拽移动，拖拽角落缩放
            </div>
            <div className="RecordingOverlay__handle" data-handle="nw" />
            <div className="RecordingOverlay__handle" data-handle="ne" />
            <div className="RecordingOverlay__handle" data-handle="sw" />
            <div className="RecordingOverlay__handle" data-handle="se" />
          </>
        )}

        {/* REC badge — visible while recording or paused */}
        {isRecordingActive && (
          <div
            className={`RecordingOverlay__rec-badge ${
              status === "recording"
                ? "RecordingOverlay__rec-badge--breathing"
                : "RecordingOverlay__rec-badge--paused"
            }`}
          >
            <span className="RecordingOverlay__rec-dot" />
            REC
          </div>
        )}

        {config.camera.enabled && cameraPosition && (
          <div
            className="RecordingOverlay__camera"
            style={{
              width: cameraSize,
              height: cameraSize,
              left: cameraPosition.x,
              top: cameraPosition.y,
            }}
            onPointerDown={handleCameraPointerDown}
          >
            <video ref={videoRef} muted playsInline />
          </div>
        )}
      </div>

      {/* Error panel — only shown when there is an error */}
      {error && (
        <div
          className="RecordingOverlay__panel"
          style={{
            left: canvasBounds.left + recordingArea.x + recordingArea.width / 2,
            top: canvasBounds.top + recordingArea.y + recordingArea.height + 20,
          }}
        >
          <div className="RecordingOverlay__panel-inner">
            <div className="RecordingOverlay__error">{error}</div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
};
