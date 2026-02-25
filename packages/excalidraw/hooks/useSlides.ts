import {
  useSetAtom,
  useAtom,
  slidesAtom,
  activeSlideIdAtom,
  isSlidesPanelOpenAtom,
} from "../editor-jotai";
import { recordingConfigAtom } from "../recording/recordingState";
import { RECORDING_RESOLUTIONS } from "../recording/types";
import type { Slide } from "../types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

const generateId = () =>
  `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_SLIDE_WIDTH = 300;
const DEFAULT_ASPECT_RATIO = 9 / 16; // 9:16 vertical ratio

// Get aspect ratio from recording config or default
const getRecordingAspectRatio = (config: { aspectRatio: string }): number => {
  const resolution =
    RECORDING_RESOLUTIONS[
      config.aspectRatio as keyof typeof RECORDING_RESOLUTIONS
    ];
  if (resolution) {
    return resolution.width / resolution.height;
  }
  return DEFAULT_ASPECT_RATIO;
};

export const useSlides = () => {
  const [slides, setSlides] = useAtom(slidesAtom);
  const [activeSlideId, setActiveSlideId] = useAtom(activeSlideIdAtom);
  const [isSlidesPanelOpen, setIsSlidesPanelOpen] = useAtom(
    isSlidesPanelOpenAtom,
  );
  const [recordingConfig] = useAtom(recordingConfigAtom);

  const createSlide = (
    canvasWidth?: number,
    canvasHeight?: number,
  ): Slide | null => {
    // Check if slide limit is reached
    if (slides.length >= 20) {
      return null;
    }

    // Get aspect ratio from recording config
    const aspectRatio = getRecordingAspectRatio(recordingConfig);
    console.log(
      "[useSlides] recordingConfig:",
      recordingConfig,
      "aspectRatio:",
      aspectRatio,
    );

    // Calculate slide dimensions based on recording aspect ratio
    const width = DEFAULT_SLIDE_WIDTH;
    const height = Math.round(width / aspectRatio);
    console.log(
      "[useSlides] creating slide with width:",
      width,
      "height:",
      height,
    );

    // Calculate x position for horizontal arrangement
    // Place each new slide to the right of the last one with some spacing
    const spacing = 40;
    const lastSlide = slides[slides.length - 1];
    const x = lastSlide
      ? (lastSlide.x || 20) + (lastSlide.width || width) + spacing
      : 20;
    const y = 20; // Start from top with some margin

    const newSlide: Slide = {
      id: generateId(),
      name: `Slide ${slides.length + 1}`,
      elements: [],
      width,
      height,
      x,
      y,
      createdAt: Date.now(),
    };
    setSlides([...slides, newSlide]);
    setActiveSlideId(newSlide.id);
    setIsSlidesPanelOpen(true);
    return newSlide;
  };

  const switchToSlide = (slideId: string) => {
    const slide = slides.find((s) => s.id === slideId);
    if (slide) {
      setActiveSlideId(slideId);
      setIsSlidesPanelOpen(true);
    }
  };

  const saveCurrentElements = (elements: ExcalidrawElement[]) => {
    if (!activeSlideId) return;

    setSlides((prevSlides) =>
      prevSlides.map((slide) =>
        slide.id === activeSlideId
          ? { ...slide, elements: [...elements] }
          : slide,
      ),
    );
  };

  const loadSlideElements = (slideId: string): ExcalidrawElement[] => {
    const slide = slides.find((s) => s.id === slideId);
    return slide ? [...slide.elements] : [];
  };

  const deleteSlide = (slideId: string) => {
    if (slides.length <= 1) return;

    const newSlides = slides.filter((s) => s.id !== slideId);
    setSlides(newSlides);

    if (activeSlideId === slideId) {
      const currentIndex = slides.findIndex((s) => s.id === slideId);
      const newIndex = Math.min(currentIndex, newSlides.length - 1);
      setActiveSlideId(newSlides[newIndex].id);
    }
  };

  return {
    slides,
    activeSlideId,
    isSlidesPanelOpen,
    setIsSlidesPanelOpen,
    createSlide,
    switchToSlide,
    saveCurrentElements,
    loadSlideElements,
    deleteSlide,
    setSlides,
    setActiveSlideId,
  };
};
