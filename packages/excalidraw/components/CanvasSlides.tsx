import React, { useState, useCallback, useRef, useEffect } from "react";

import { useAtomValue, useSetAtom } from "../editor-jotai";
import {
  activeSlideIdAtom,
  slidesAtom,
  scrollTargetAtom,
} from "../editor-jotai";
import type { Slide } from "../types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import "./CanvasSlides.scss";

interface DragState {
  slideId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  // Track initial element positions to avoid cumulative offset issues
  elementInitialPositions: Map<string, { x: number; y: number }>;
}

interface ResizeState {
  slideId: string;
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
  initialX: number;
  initialY: number;
  direction: string;
}

const MIN_SLIDE_WIDTH = 100;
const MIN_SLIDE_HEIGHT = 100;
const MAX_SLIDE_WIDTH = 2000;
const MAX_SLIDE_HEIGHT = 2000;
const DEFAULT_ASPECT_RATIO = 9 / 16; // 9:16 vertical ratio
const EDGE_ZONE = 8; // Edge drag zone in pixels

interface CanvasSlidesProps {
  zoom: number;
  scrollX: number;
  scrollY: number;
  elements?: readonly ExcalidrawElement[];
  onElementsUpdate?: (elements: ExcalidrawElement[]) => void;
}

export const CanvasSlides: React.FC<CanvasSlidesProps> = ({
  zoom,
  scrollX,
  scrollY,
  elements,
  onElementsUpdate,
}) => {
  console.log(
    "[CanvasSlides] scrollX:",
    scrollX,
    "scrollY:",
    scrollY,
    "zoom:",
    zoom,
  );
  const slides = useAtomValue(slidesAtom);
  const activeSlideId = useAtomValue(activeSlideIdAtom);
  const setActiveSlideIdAtom = useSetAtom(activeSlideIdAtom);
  const setSlidesAtom = useSetAtom(slidesAtom);
  const scrollTarget = useAtomValue(scrollTargetAtom);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [hoveredSlideId, setHoveredSlideId] = useState<string | null>(null);
  const [isDraggingEdge, setIsDraggingEdge] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to find which slide contains the element
  const findSlideForElement = (
    element: ExcalidrawElement,
    slides: Slide[],
  ): string | null => {
    const elementX = element.x;
    const elementY = element.y;
    const elementWidth = element.width || 0;
    const elementHeight = element.height || 0;

    // For line/arrow elements, use points for bounds
    if (
      element.type === "line" ||
      element.type === "arrow" ||
      element.type === "freedraw"
    ) {
      if (!element.points || element.points.length === 0) {
        return null;
      }
    }

    // Skip zero-dimension elements
    if (elementWidth === 0 && elementHeight === 0) {
      return null;
    }

    // Find the first slide that contains the element
    for (const slide of slides) {
      const slideX = slide.x || 0;
      const slideY = slide.y || 0;
      const slideWidth = slide.width || 0;
      const slideHeight = slide.height || 0;

      // Check if element is at least partially inside the slide
      if (
        elementX + elementWidth > slideX &&
        elementX < slideX + slideWidth &&
        elementY + elementHeight > slideY &&
        elementY < slideY + slideHeight
      ) {
        return slide.id;
      }
    }

    return null;
  };

  // Track processed element IDs to avoid duplicate processing
  const processedElementIds = useRef<Set<string>>(new Set());

  // Check and update element slideId after creation or move
  const checkAndUpdateSlideId = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      onUpdate: (els: ExcalidrawElement[]) => void,
    ) => {
      if (!slides.length) return;

      const slideIdMap = new Map<string, string>();
      let hasChanges = false;

      for (const element of elements) {
        // Skip if already has slideId
        if (element.slideId) {
          continue;
        }

        // Skip if already processed
        if (processedElementIds.current.has(element.id)) {
          continue;
        }

        const slideId = findSlideForElement(element, slides);
        if (slideId) {
          slideIdMap.set(element.id, slideId);
          processedElementIds.current.add(element.id);
          hasChanges = true;
        }
      }

      if (hasChanges && slideIdMap.size > 0) {
        const updatedElements = elements.map((element) => {
          const slideId = slideIdMap.get(element.id);
          if (slideId) {
            return { ...element, slideId };
          }
          return element;
        });
        onUpdate(updatedElements);
      }
    },
    [slides],
  );

  // Track previous slides state to detect position changes
  const prevSlidesRef = useRef<Slide[]>([]);

  // When slides change position, update elements to follow
  useEffect(() => {
    if (!elements || !onElementsUpdate || slides.length === 0) {
      prevSlidesRef.current = slides;
      return;
    }

    const prevSlides = prevSlidesRef.current;
    const slidePositionChanges = new Map<string, { dx: number; dy: number }>();

    // Detect position changes for each slide
    for (const slide of slides) {
      const prevSlide = prevSlides.find((s) => s.id === slide.id);
      if (prevSlide) {
        const dx = (slide.x || 0) - (prevSlide.x || 0);
        const dy = (slide.y || 0) - (prevSlide.y || 0);
        if (dx !== 0 || dy !== 0) {
          slidePositionChanges.set(slide.id, { dx, dy });
        }
      }
    }

    // If there are position changes, update elements
    if (slidePositionChanges.size > 0) {
      const updatedElements = elements.map((element) => {
        const posChange = slidePositionChanges.get(element.slideId || "");
        if (posChange) {
          return {
            ...element,
            x: element.x + posChange.dx,
            y: element.y + posChange.dy,
          };
        }
        return element;
      });

      // Only update if there were actual changes
      const hasChanges = updatedElements.some((el, i) => {
        const orig = elements[i];
        return el.x !== orig.x || el.y !== orig.y;
      });

      if (hasChanges) {
        onElementsUpdate(updatedElements);
      }
    }

    prevSlidesRef.current = slides;
  }, [slides, elements, onElementsUpdate]);

  // Debounced check for element slideId after elements change
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!elements || !onElementsUpdate || slides.length === 0) {
      return;
    }

    // Debounce the check to avoid running too frequently
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkAndUpdateSlideId(elements, onElementsUpdate);
    }, 100);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [elements, slides, onElementsUpdate, checkAndUpdateSlideId]);

  // Note: Auto-detecting element slideId based on position is disabled for now
  // to avoid interfering with element creation. The slide-drag functionality
  // still works for elements that have slideId set manually or through other means.

  // Dispatch custom event when scroll target changes
  useEffect(() => {
    if (scrollTarget) {
      window.dispatchEvent(
        new CustomEvent("excalidraw-scroll-to", {
          detail: scrollTarget,
        }),
      );
    }
  }, [scrollTarget]);

  // Check if pointer is in edge zone
  const isInEdgeZone = useCallback((e: React.PointerEvent, slide: Slide) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if in edge zone (8px from any edge)
    const inLeftEdge = x <= EDGE_ZONE;
    const inRightEdge = x >= rect.width - EDGE_ZONE;
    const inTopEdge = y <= EDGE_ZONE;
    const inBottomEdge = y >= rect.height - EDGE_ZONE;

    return inLeftEdge || inRightEdge || inTopEdge || inBottomEdge;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, slideId: string) => {
      const slide = slides.find((s) => s.id === slideId);
      if (!slide) return;

      e.stopPropagation();
      setActiveSlideIdAtom(slideId);

      // Record initial positions of elements belonging to this slide
      const elementInitialPositions = new Map<
        string,
        { x: number; y: number }
      >();
      if (elements) {
        elements.forEach((el) => {
          if (el.slideId === slideId) {
            elementInitialPositions.set(el.id, { x: el.x, y: el.y });
          }
        });
      }

      // Start dragging from anywhere on the slide
      setDragState({
        slideId,
        startX: e.clientX,
        startY: e.clientY,
        initialX: slide.x || 0,
        initialY: slide.y || 0,
        elementInitialPositions,
      });
    },
    [slides, setActiveSlideIdAtom, elements],
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, slideId: string, direction: string) => {
      e.stopPropagation();
      const slide = slides.find((s) => s.id === slideId);
      if (!slide) return;

      setActiveSlideIdAtom(slideId);

      setResizeState({
        slideId,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: slide.width,
        initialHeight: slide.height,
        initialX: slide.x || 0,
        initialY: slide.y || 0,
        direction,
      });
    },
    [slides, setActiveSlideIdAtom],
  );

  // Handle pointer move for edge hover cursor
  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (hoveredSlideId) {
        const slide = slides.find((s) => s.id === hoveredSlideId);
        if (slide) {
          setIsDraggingEdge(isInEdgeZone(e, slide));
        }
      }
    },
    [hoveredSlideId, slides, isInEdgeZone],
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragState) {
        // Convert screen coordinates to world coordinates
        const dx = (e.clientX - dragState.startX) / zoom;
        const dy = (e.clientY - dragState.startY) / zoom;

        const newSlideX = dragState.initialX + dx;
        const newSlideY = dragState.initialY + dy;

        setSlidesAtom((prevSlides) =>
          prevSlides.map((slide) =>
            slide.id === dragState.slideId
              ? {
                  ...slide,
                  x: newSlideX,
                  y: newSlideY,
                }
              : slide,
          ),
        );

        // Update elements that belong to this slide using slideId
        if (
          elements &&
          onElementsUpdate &&
          dragState.elementInitialPositions.size > 0
        ) {
          // Calculate the delta from slide's initial position
          const elementDx = newSlideX - dragState.initialX;
          const elementDy = newSlideY - dragState.initialY;

          // Only update if there's actual movement
          if (elementDx !== 0 || elementDy !== 0) {
            const updatedElements = elements.map((el) => {
              const initialPos = dragState.elementInitialPositions.get(el.id);
              if (initialPos) {
                return {
                  ...el,
                  x: initialPos.x + elementDx,
                  y: initialPos.y + elementDy,
                };
              }
              return el;
            });

            onElementsUpdate(updatedElements);
          }
        }
      }

      if (resizeState) {
        // Convert screen coordinates to world coordinates
        const dx = (e.clientX - resizeState.startX) / zoom;
        const dy = (e.clientY - resizeState.startY) / zoom;

        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;
        let newX = resizeState.initialX;
        let newY = resizeState.initialY;

        // Only handle corner resize (proportional scaling)
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const useHorizontal = absDx > absDy;

        const scale = useHorizontal
          ? (resizeState.initialWidth +
              (resizeState.direction.includes("e") ? dx : -dx)) /
            resizeState.initialWidth
          : (resizeState.initialHeight +
              (resizeState.direction.includes("s") ? dy : -dy)) /
            resizeState.initialHeight;

        const newSize = Math.min(
          MAX_SLIDE_WIDTH,
          Math.max(
            MIN_SLIDE_WIDTH,
            Math.round(resizeState.initialWidth * scale),
          ),
        );

        newWidth = newSize;
        newHeight = newSize / DEFAULT_ASPECT_RATIO;

        const widthDiff = newWidth - resizeState.initialWidth;
        const heightDiff = newHeight - resizeState.initialHeight;

        if (resizeState.direction.includes("w")) {
          newX = resizeState.initialX - widthDiff;
        }
        if (resizeState.direction.includes("n")) {
          newY = resizeState.initialY - heightDiff;
        }

        newWidth = Math.min(
          MAX_SLIDE_WIDTH,
          Math.max(MIN_SLIDE_WIDTH, newWidth),
        );
        newHeight = Math.min(
          MAX_SLIDE_HEIGHT,
          Math.max(MIN_SLIDE_HEIGHT, newHeight),
        );

        setSlidesAtom((prevSlides) =>
          prevSlides.map((slide) =>
            slide.id === resizeState.slideId
              ? {
                  ...slide,
                  width: newWidth,
                  height: newHeight,
                  x: newX,
                  y: newY,
                }
              : slide,
          ),
        );
      }
    };

    const handlePointerUp = () => {
      setDragState(null);
      setResizeState(null);
      setIsDraggingEdge(false);
    };

    if (dragState || resizeState) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    dragState,
    resizeState,
    setSlidesAtom,
    slides,
    elements,
    onElementsUpdate,
  ]);

  // Wheel handler removed - trackpad zoom should trigger canvas zoom, not slide resize

  if (!slides || slides.length === 0) {
    return null;
  }

  const resizeHandles = ["ne", "nw", "se", "sw"];

  return (
    <div
      ref={containerRef}
      className="canvas-slides-container"
      onPointerMove={handleContainerPointerMove}
    >
      {slides.map((slide) => (
        <div
          key={slide.id}
          className={`canvas-slide ${
            slide.id === activeSlideId ? "canvas-slide--active" : ""
          } ${
            isDraggingEdge && slide.id === hoveredSlideId
              ? "canvas-slide--edge-hover"
              : ""
          } ${slide.id === activeSlideId ? "canvas-slide--draggable" : ""}`}
          style={{
            left: ((slide.x || 0) + scrollX) * zoom,
            top: ((slide.y || 0) + scrollY) * zoom,
            width: (slide.width || 300) * zoom,
            height: (slide.height || 168) * zoom,
          }}
          onPointerDown={(e) => {
            // Slide is not active - click to select
            if (slide.id !== activeSlideId) {
              setActiveSlideIdAtom(slide.id);
            }
            // If slide is active, let events pass through to canvas (content area)
          }}
          onPointerEnter={() => setHoveredSlideId(slide.id)}
          onPointerLeave={() => {
            setHoveredSlideId(null);
            setIsDraggingEdge(false);
          }}
        >
          {/* Drag zone - always visible, but drag only works when selected */}
          <div className="canvas-slide__drag-zone">
            {/* Edge drag handles */}
            <div
              className="canvas-slide__drag-zone-top"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (slide.id === activeSlideId) {
                  handlePointerDown(e, slide.id);
                } else {
                  setActiveSlideIdAtom(slide.id);
                }
              }}
            />
            <div
              className="canvas-slide__drag-zone-bottom"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (slide.id === activeSlideId) {
                  handlePointerDown(e, slide.id);
                } else {
                  setActiveSlideIdAtom(slide.id);
                }
              }}
            />
            <div
              className="canvas-slide__drag-zone-left"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (slide.id === activeSlideId) {
                  handlePointerDown(e, slide.id);
                } else {
                  setActiveSlideIdAtom(slide.id);
                }
              }}
            />
            <div
              className="canvas-slide__drag-zone-right"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (slide.id === activeSlideId) {
                  handlePointerDown(e, slide.id);
                } else {
                  setActiveSlideIdAtom(slide.id);
                }
              }}
            />
          </div>

          {/* Header - for showing name only (not for dragging) */}
          <div className="canvas-slide__header">
            <span className="canvas-slide__name">{slide.name}</span>
          </div>

          {/* Content area - pointer events pass through to canvas */}
          {/* This allows clicking inside slide to add elements */}
          <div className="canvas-slide__content">
            {/* Elements will be rendered here */}
          </div>

          {/* Resize handles */}
          {slide.id === activeSlideId && (
            <>
              {resizeHandles.map((direction) => (
                <div
                  key={direction}
                  className={`canvas-slide__resize-handle canvas-slide__resize-handle--${direction}`}
                  onPointerDown={(e) =>
                    handleResizePointerDown(e, slide.id, direction)
                  }
                />
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasSlides;
