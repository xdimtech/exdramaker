import { atom } from "../editor-jotai";

import { DEFAULT_RECORDING_CONFIG } from "./types";

import type { RecordingConfig, RecordingStatus } from "./types";

export const recordingConfigAtom = atom<RecordingConfig>(
  DEFAULT_RECORDING_CONFIG,
);

export const recordingStatusAtom = atom<RecordingStatus>("idle");

export const recordingDurationAtom = atom<number>(0);

export const recordingBlobAtom = atom<Blob | null>(null);

export const recordingOverlayAtom = atom<boolean>(false);

// 提词器状态
export interface TeleprompterConfig {
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  scrollSpeed: number; // pixels per second
  fontSize: number;
}

export const teleprompterConfigAtom = atom<TeleprompterConfig>({
  visible: false,
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  opacity: 0.9,
  scrollSpeed: 30,
  fontSize: 24,
});

export const teleprompterTextAtom = atom<string>("");

// Engine reference — allows RecordingToolbar to pause/resume/stop without
// prop-drilling through the whole component tree.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const recordingEngineAtom = atom<any>(null);

// Increment this atom to signal RecordingOverlay to begin recording.
// Toolbar increments; overlay listens and calls handleStartRecording.
export const recordingStartRequestAtom = atom<number>(0);

// 录制区域位置（相对于画布）
export interface RecordingAreaPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const recordingAreaPositionAtom = atom<RecordingAreaPosition | null>(
  null,
);

// 区域选择状态
export interface AreaSelection {
  active: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  selectedArea: { x: number; y: number; width: number; height: number } | null;
}

export const areaSelectionAtom = atom<AreaSelection>({
  active: false,
  startPoint: null,
  endPoint: null,
  selectedArea: null,
});
