// eslint-disable-next-line no-restricted-imports
import {
  atom,
  createStore,
  type PrimitiveAtom,
  type WritableAtom,
} from "jotai";
import { createIsolation } from "jotai-scope";

import type { Slide } from "./types";

const jotai = createIsolation();

export { atom, PrimitiveAtom, WritableAtom };
export const { useAtom, useSetAtom, useAtomValue, useStore } = jotai;
export const EditorJotaiProvider: ReturnType<
  typeof createIsolation
>["Provider"] = jotai.Provider;

export const editorJotaiStore: ReturnType<typeof createStore> = createStore();

// Local storage key for slides persistence
const SLIDES_STORAGE_KEY = "excalidraw-slides";

// Helper to get slides from localStorage
const getStoredSlides = (): Slide[] => {
  try {
    const stored = localStorage.getItem(SLIDES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Slide[];
    }
  } catch (e) {
    console.warn("Failed to load slides from localStorage:", e);
  }
  return [];
};

// Helper to save slides to localStorage
const storeSlides = (slides: Slide[]) => {
  try {
    if (slides.length > 0) {
      localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slides));
    } else {
      localStorage.removeItem(SLIDES_STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Failed to save slides to localStorage:", e);
  }
};

// Initialize slides from localStorage
const initialSlides = getStoredSlides();

// Slide state management
export const slidesAtom = atom<Slide[]>(initialSlides);

// Subscribe to slides changes and persist to localStorage
editorJotaiStore.sub(slidesAtom, () => {
  const currentSlides = editorJotaiStore.get(slidesAtom);
  storeSlides(currentSlides);
});

export const activeSlideIdAtom = atom<string | null>(null);
export const isSlidesPanelOpenAtom = atom<boolean>(false);
export const focusedSlideIdAtom = atom<string | null>(null); // For view focusing

// Scroll target for focusing on slides
export const scrollTargetAtom = atom<{ x: number; y: number } | null>(null);

// Canvas zoom for recording mode
export const recordingZoomAtom = atom<number | null>(null);

// Recording mode state
export const isRecordingAtom = atom<boolean>(false);
export const recordingAreaSizeAtom = atom<{
  width: number;
  height: number;
} | null>(null);
