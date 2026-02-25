import React, { useState } from "react";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

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
import type { BinaryFiles, UIAppState } from "../../types";

type RecordingControlsProps = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Readonly<UIAppState>;
  files: BinaryFiles;
  config: RecordingConfig;
  recordingArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  onStartRecording?: (
    config: RecordingConfig,
    area?: { x: number; y: number; width: number; height: number },
  ) => void;
};

export const RecordingControls = ({
  elements,
  appState,
  files,
  config,
  recordingArea,
  onStartRecording,
}: RecordingControlsProps) => {
  const [status, setStatus] = useAtom(recordingStatusAtom);
  const setDuration = useSetAtom(recordingDurationAtom);
  const setBlob = useSetAtom(recordingBlobAtom);
  const [engine, setEngine] = useState<RecordingEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCanvas = () =>
    (document.querySelector("canvas.excalidraw__canvas.static") ||
      document.querySelector("canvas.excalidraw__canvas.interactive") ||
      document.querySelector(
        "canvas.excalidraw__canvas",
      )) as HTMLCanvasElement | null;

  const startRecording = async (area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (onStartRecording) {
      onStartRecording(config, area);
      return;
    }

    try {
      setError(null);

      // 获取画布元素
      const canvas = getCanvas();
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
        area,
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

      // 存储计时器引用，便于清理
      (newEngine as any).timer = timer;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "录制启动失败");
    }
  };

  const handleRequestStart = () => {
    void startRecording(recordingArea ?? undefined);
  };

  const handleStopRecording = async () => {
    if (!engine) {
      return;
    }

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
          onClick={handleRequestStart}
          label={t("recording.startRecording" as any)}
        />
      )}

      {status === "recording" && (
        <>
          <FilledButton
            size="large"
            variant="outlined"
            onClick={handlePauseRecording}
            label={t("recording.pauseRecording" as any)}
          />
          <FilledButton
            size="large"
            onClick={handleStopRecording}
            label={t("recording.stopRecording" as any)}
          />
        </>
      )}

      {status === "paused" && (
        <>
          <FilledButton
            size="large"
            onClick={handleResumeRecording}
            label={t("recording.resumeRecording" as any)}
          />
          <FilledButton
            size="large"
            variant="outlined"
            onClick={handleStopRecording}
            label={t("recording.stopRecording" as any)}
          />
        </>
      )}
    </div>
  );
};
