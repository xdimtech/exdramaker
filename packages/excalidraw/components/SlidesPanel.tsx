import clsx from "clsx";
import React from "react";

import {
  useAtom,
  useSetAtom,
  slidesAtom,
  activeSlideIdAtom,
  isSlidesPanelOpenAtom,
} from "../editor-jotai";
import { recordingConfigAtom } from "../recording/recordingState";
import { RECORDING_RESOLUTIONS } from "../recording/types";
import { t } from "../i18n";

import { CloseIcon, PlusIcon, TrashIcon } from "./icons";
import { Island } from "./Island";

import "./SlidesPanel.scss";

const DEFAULT_SLIDE_WIDTH = 300;
const DEFAULT_ASPECT_RATIO = 9 / 16;

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

export const SlidesPanel = ({
  app,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any;
}) => {
  const [slides, setSlides] = useAtom(slidesAtom);
  const [activeSlideId, setActiveSlideId] = useAtom(activeSlideIdAtom);
  const setIsSlidesPanelOpen = useSetAtom(isSlidesPanelOpenAtom);
  const [recordingConfig, setRecordingConfig] = useAtom(recordingConfigAtom);
  console.log("[SlidesPanel] render, recordingConfig:", recordingConfig);

  const activeIndex = slides.findIndex((s) => s.id === activeSlideId);

  const handleClose = () => {
    setIsSlidesPanelOpen(false);
  };

  const switchToSlide = (slideId: string) => {
    if (!app || !activeSlideId) {
      return;
    }

    // Save current elements to the current slide
    const currentElements = app.getSceneElements();
    setSlides((prevSlides) =>
      prevSlides.map((slide) =>
        slide.id === activeSlideId
          ? { ...slide, elements: [...currentElements] }
          : slide,
      ),
    );

    // Switch to the new slide
    setActiveSlideId(slideId);

    // Load the new slide's elements
    const targetSlide = slides.find((s) => s.id === slideId);
    if (targetSlide) {
      app.updateScene({
        elements: targetSlide.elements,
      });
    }
  };

  const handleSlideClick = (slideId: string) => {
    switchToSlide(slideId);
  };

  const handleDeleteSlide = (e: React.MouseEvent, slideId: string) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      return;
    }

    const newSlides = slides.filter((s) => s.id !== slideId);
    setSlides(newSlides);

    if (activeSlideId === slideId) {
      const newActiveIndex = Math.min(activeIndex, newSlides.length - 1);
      setActiveSlideId(newSlides[newActiveIndex].id);
      switchToSlide(newSlides[newActiveIndex].id);
    }
  };

  const handleAddSlide = () => {
    // Check if slide limit is reached
    if (slides.length >= 20) {
      return;
    }

    // Get aspect ratio from recording config
    const aspectRatio = getRecordingAspectRatio(recordingConfig);
    console.log(
      "[SlidesPanel] recordingConfig:",
      recordingConfig,
      "aspectRatio:",
      aspectRatio,
    );

    // Calculate position for new slide - horizontal arrangement with spacing
    const spacing = 40;
    const slideWidth = DEFAULT_SLIDE_WIDTH;
    const slideHeight = Math.round(slideWidth / aspectRatio);
    console.log(
      "[SlidesPanel] creating slide with width:",
      slideWidth,
      "height:",
      slideHeight,
    );

    // Calculate x position: each slide placed to the right of the previous one
    const x =
      slides.length > 0
        ? (slides[slides.length - 1].x || 20) +
          (slides[slides.length - 1].width || slideWidth) +
          spacing
        : 20;
    const y = 20;

    // Save current elements before creating a new slide
    if (app && activeSlideId) {
      const currentElements = app.getSceneElements();
      setSlides((prevSlides) =>
        prevSlides.map((slide) =>
          slide.id === activeSlideId
            ? { ...slide, elements: [...currentElements] }
            : slide,
        ),
      );
    }

    const newSlide = {
      id: `slide-${Date.now()}`,
      name: `Slide ${slides.length + 1}`,
      elements: [],
      width: slideWidth,
      height: slideHeight,
      x,
      y,
      createdAt: Date.now(),
    };

    setSlides([...slides, newSlide]);
    setActiveSlideId(newSlide.id);
    setIsSlidesPanelOpen(true);

    // Clear canvas for the new slide
    if (app) {
      app.updateScene({
        elements: [],
      });
    }
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="slides-panel">
      <Island padding={1}>
        <div className="slides-panel__header">
          <span className="slides-panel__title">{t("slides.title")}</span>
          <div className="slides-panel__actions">
            <button
              className="slides-panel__add-btn"
              onClick={handleAddSlide}
              title={t("slides.add")}
            >
              {PlusIcon}
            </button>
            <button
              className="slides-panel__close-btn"
              onClick={handleClose}
              title={t("slides.close")}
            >
              {CloseIcon}
            </button>
          </div>
        </div>
        <div className="slides-panel__content">
          <div
            className="slides-panel__list"
            style={{
              transform: `translateX(${activeIndex * -160 + 200}px)`,
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={clsx("slides-panel__slide", {
                  "slides-panel__slide--active": slide.id === activeSlideId,
                })}
                onClick={() => handleSlideClick(slide.id)}
              >
                <div className="slides-panel__slide-number">{index + 1}</div>
                <div className="slides-panel__slide-preview">
                  {slide.elements.length === 0 ? (
                    <div className="slides-panel__slide-empty">
                      {t("slides.empty")}
                    </div>
                  ) : (
                    <div className="slides-panel__slide-count">
                      {slide.elements.length}
                    </div>
                  )}
                </div>
                {slides.length > 1 && (
                  <button
                    className="slides-panel__slide-delete"
                    onClick={(e) => handleDeleteSlide(e, slide.id)}
                    title={t("slides.delete")}
                  >
                    {TrashIcon}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Island>
    </div>
  );
};

export default SlidesPanel;
