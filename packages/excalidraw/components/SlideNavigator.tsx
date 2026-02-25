import React, { useEffect, useRef } from "react";

import { useAtomValue, useSetAtom, useAtom } from "../editor-jotai";
import {
  activeSlideIdAtom,
  slidesAtom,
  focusedSlideIdAtom,
  scrollTargetAtom,
  isSlidesPanelOpenAtom,
  isRecordingAtom,
  recordingAreaSizeAtom,
} from "../editor-jotai";
import {
  recordingConfigAtom,
  recordingAreaPositionAtom,
} from "../recording/recordingState";
import { RECORDING_RESOLUTIONS } from "../recording/types";

import "./SlideNavigator.scss";

interface SlideNavigatorProps {
  zoom?: number;
}

export const SlideNavigator: React.FC<SlideNavigatorProps> = ({ zoom = 1 }) => {
  const generateId = () =>
    `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const DEFAULT_SLIDE_WIDTH = 300;
  const DEFAULT_ASPECT_RATIO = 9 / 16;
  const MAX_SLIDES = 20;

  const slides = useAtomValue(slidesAtom);
  const activeSlideId = useAtomValue(activeSlideIdAtom);
  const setActiveSlideIdAtom = useSetAtom(activeSlideIdAtom);
  const setFocusedSlideIdAtom = useSetAtom(focusedSlideIdAtom);
  const setScrollTargetAtom = useSetAtom(scrollTargetAtom);
  const setSlidesAtom = useSetAtom(slidesAtom);
  const setIsSlidesPanelOpenAtom = useSetAtom(isSlidesPanelOpenAtom);
  const [, setActiveSlideIdState] = useAtom(activeSlideIdAtom);
  const [, setSlidesState] = useAtom(slidesAtom);
  const isRecording = useAtomValue(isRecordingAtom);
  const setIsRecording = useSetAtom(isRecordingAtom);
  const setRecordingAreaSize = useSetAtom(recordingAreaSizeAtom);
  const [recordingConfig] = useAtom(recordingConfigAtom);
  const recordingAreaPosition = useAtomValue(recordingAreaPositionAtom);
  const prevActiveSlideRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleStartRecording = () => {
    if (slides.length === 0) return;

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

    // Calculate viewport center
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = (viewportWidth - recordingWidth) / 2;
    const centerY = (viewportHeight - recordingHeight) / 2;

    // Calculate zoom: make slide match recording area size
    // Since slide and recording area have same aspect ratio, use width
    const zoom = recordingWidth / firstSlide.width;
    console.log(
      "[handleStartRecording] zoom:",
      zoom,
      "recordingWidth:",
      recordingWidth,
      "firstSlide.width:",
      firstSlide.width,
    );

    // Dispatch event to set canvas zoom
    window.dispatchEvent(
      new CustomEvent("excalidraw-recording-zoom", {
        detail: { zoom },
      }),
    );
    console.log("[handleStartRecording] dispatched zoom event");

    // Calculate offset to move first slide to recording area center
    // Relative positions of all slides remain unchanged
    const firstSlideX = firstSlide.x || 0;
    const firstSlideY = firstSlide.y || 0;

    // Move all slides so first slide's center is at recording area center
    const targetX =
      centerX +
      recordingWidth / 2 -
      (firstSlideX + firstSlide.width / 2) * zoom;
    const targetY =
      centerY +
      recordingHeight / 2 -
      (firstSlideY + firstSlide.height / 2) * zoom;

    setSlidesAtom((prevSlides) =>
      prevSlides.map((slide) => ({
        ...slide,
        x: ((slide.x || 0) - firstSlideX) * zoom + firstSlideX + targetX,
        y: ((slide.y || 0) - firstSlideY) * zoom + firstSlideY + targetY,
      })),
    );

    // Scroll to center the recording area
    setScrollTargetAtom({
      x: centerX + recordingWidth / 2,
      y: centerY + recordingHeight / 2,
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingAreaSize(null);
  };

  const handleSlideClick = (slideId: string) => {
    // If recording area is positioned (pre-recording or recording), shift slides
    if (recordingAreaPosition) {
      const clickedSlide = slides.find((s) => s.id === slideId);
      if (!clickedSlide) return;

      // Get current position of clicked slide
      const clickedSlideX = clickedSlide.x || 0;
      const clickedSlideY = clickedSlide.y || 0;

      // Target position is top-left of recording area
      // recordingAreaPosition is in screen coords, convert to canvas coords
      const targetX = recordingAreaPosition.x / zoom;
      const targetY = recordingAreaPosition.y / zoom;

      // Calculate offset needed to move clicked slide to target
      const offsetX = targetX - clickedSlideX;
      const offsetY = targetY - clickedSlideY;

      // Move all slides by the same offset to maintain relative positions
      setSlidesAtom((prevSlides) =>
        prevSlides.map((slide) => ({
          ...slide,
          x: (slide.x || 0) + offsetX,
          y: (slide.y || 0) + offsetY,
        })),
      );
    }

    setActiveSlideIdAtom(slideId);
    setFocusedSlideIdAtom(slideId);
  };

  const handleAddSlide = () => {
    // Check if slide limit is reached
    if (slides.length >= MAX_SLIDES) {
      return;
    }

    // Get aspect ratio from recording config
    const resolution =
      RECORDING_RESOLUTIONS[
        recordingConfig.aspectRatio as keyof typeof RECORDING_RESOLUTIONS
      ] || RECORDING_RESOLUTIONS["9:16"];
    const aspectRatio = resolution.width / resolution.height;
    console.log(
      "[SlideNavigator] handleAddSlide, recordingConfig:",
      recordingConfig,
      "aspectRatio:",
      aspectRatio,
    );

    // Calculate slide dimensions based on recording aspect ratio
    const width = DEFAULT_SLIDE_WIDTH;
    const height = Math.round(width / aspectRatio);
    console.log(
      "[SlideNavigator] creating slide with width:",
      width,
      "height:",
      height,
    );

    // Calculate position for new slide
    let newX: number;
    let newY: number;
    const spacing = 40;

    let updatedSlides: typeof slides = slides;

    if (recordingAreaPosition && slides.length > 0) {
      // In recording mode, place new slide to the right of the last slide
      // maintaining relative position
      const lastSlide = slides[slides.length - 1];
      newX = (lastSlide.x || 0) + lastSlide.width + spacing;
      newY = lastSlide.y || 0;
    } else {
      // Get viewport dimensions for centering (non-recording mode)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      newX = (viewportWidth - width) / 2;
      newY = (viewportHeight - height) / 2;

      // Shift existing slides to the left to make room for the new slide
      const shiftAmount = width + spacing;
      updatedSlides = slides.map((slide) => ({
        ...slide,
        x: (slide.x || 0) - shiftAmount,
      }));
    }

    const newSlide = {
      id: generateId(),
      name: `Slide ${slides.length + 1}`,
      elements: [],
      width,
      height,
      x: newX,
      y: newY,
      createdAt: Date.now(),
    };

    setSlidesAtom([...updatedSlides, newSlide]);
    setActiveSlideIdAtom(newSlide.id);
    setIsSlidesPanelOpenAtom(true);

    // Scroll to the new slide after render
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  };

  // Clear scroll target after it's used
  useEffect(() => {
    if (prevActiveSlideRef.current !== activeSlideId && activeSlideId) {
      // Small delay to let the scroll happen
      const timer = setTimeout(() => {
        setScrollTargetAtom(null);
      }, 500);
      return () => clearTimeout(timer);
    }
    prevActiveSlideRef.current = activeSlideId;
  }, [activeSlideId, setScrollTargetAtom]);

  // Scroll to active slide when it changes
  useEffect(() => {
    if (activeSlideId && listRef.current) {
      const activeIndex = slides.findIndex((s) => s.id === activeSlideId);
      if (activeIndex >= 0) {
        const buttonHeight = 32; // height + gap
        const scrollPosition = activeIndex * buttonHeight;
        const containerHeight = listRef.current.clientHeight;
        const currentScroll = listRef.current.scrollTop;

        // Only scroll if the active button is outside the visible area
        if (
          scrollPosition < currentScroll ||
          scrollPosition > currentScroll + containerHeight - buttonHeight
        ) {
          listRef.current.scrollTo({
            top: scrollPosition - containerHeight / 2 + buttonHeight / 2,
            behavior: "smooth",
          });
        }
      }
    }
  }, [activeSlideId, slides]);

  // Always show + button to create first slide
  if (!slides || slides.length === 0) {
    return (
      <div className="slide-navigator">
        <button
          className="slide-navigator__button slide-navigator__button--add"
          onClick={handleAddSlide}
          title="Add slide"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="slide-navigator">
      <div className="slide-navigator__list" ref={listRef}>
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            className={`slide-navigator__button ${
              slide.id === activeSlideId
                ? "slide-navigator__button--active"
                : ""
            }`}
            onClick={() => handleSlideClick(slide.id)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {slides.length < MAX_SLIDES && (
        <button
          className="slide-navigator__button slide-navigator__button--add"
          onClick={handleAddSlide}
          title="Add slide"
        >
          +
        </button>
      )}
    </div>
  );
};

export default SlideNavigator;
