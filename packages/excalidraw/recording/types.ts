export type AspectRatio = "16:9" | "4:3" | "3:4" | "9:16" | "1:1" | "custom";
export type WallpaperCategory = "all" | "vibrant" | "soft" | "dark" | "nature";

const STORAGE_KEY = "excalidraw-recording-aspect-ratio";

// 从localStorage获取保存的aspectRatio
export const getSavedAspectRatio = (): AspectRatio => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isValidAspectRatio(saved)) {
      return saved as AspectRatio;
    }
  } catch (e) {
    console.warn("Failed to read aspect ratio from localStorage:", e);
  }
  return "16:9"; // 默认值
};

// 验证是否是有效的aspectRatio
const isValidAspectRatio = (value: string): boolean => {
  return ["16:9", "4:3", "3:4", "9:16", "1:1", "custom"].includes(value);
};

// 保存aspectRatio到localStorage
export const saveAspectRatio = (aspectRatio: AspectRatio): void => {
  try {
    localStorage.setItem(STORAGE_KEY, aspectRatio);
  } catch (e) {
    console.warn("Failed to save aspect ratio to localStorage:", e);
  }
};

export interface RecordingConfig {
  aspectRatio: AspectRatio;
  customAspectRatio?: { width: number; height: number };
  background: string; // wallpaper ID
  borderRadius: number;
  padding: number;
  camera: {
    enabled: boolean;
    size: number;
    zoom: number;
  };
  cursor: {
    enabled: boolean;
    color: string;
  };
  microphone: string | null; // device ID
}

export type RecordingStatus = "idle" | "pre-recording" | "recording" | "paused";

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
  aspectRatio: getSavedAspectRatio(), // 从localStorage读取，或默认16:9
  background: "cotton-candy",
  borderRadius: 16,
  padding: 4,
  camera: { enabled: true, size: 180, zoom: 1 },
  cursor: { enabled: false, color: "#FF4444" },
  microphone: null,
};
