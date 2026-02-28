import React, { useState, useEffect, useRef, useCallback } from "react";

import { useAtom } from "../../editor-jotai";
import {
  teleprompterConfigAtom,
  teleprompterTextAtom,
} from "../../recording/recordingState";
import { t } from "../../i18n";

import "./Teleprompter.scss";

import type { TeleprompterConfig } from "../../recording/recordingState";

const TELEPROMPTER_STORAGE_KEY = "excalidraw-teleprompter-data";
const TELEPROMPTER_CONFIG_KEY = "excalidraw-teleprompter-config";

// Load saved data from localStorage
const loadSavedText = (): string => {
  try {
    const saved = localStorage.getItem(TELEPROMPTER_STORAGE_KEY);
    return saved || "";
  } catch (error) {
    console.warn("Failed to load teleprompter text:", error);
    return "";
  }
};

const loadSavedConfig = (): Partial<TeleprompterConfig> | null => {
  try {
    const saved = localStorage.getItem(TELEPROMPTER_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  } catch (error) {
    console.warn("Failed to load teleprompter config:", error);
    return null;
  }
};

export const Teleprompter = () => {
  const [config, setConfig] = useAtom(teleprompterConfigAtom);
  const [text, setText] = useAtom(teleprompterTextAtom);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTimestampRef = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const scrollSpeedRef = useRef(config.scrollSpeed);
  const scrollAccumulatorRef = useRef<number>(0); // Accumulator for sub-pixel scrolling
  scrollSpeedRef.current = config.scrollSpeed;

  // Load saved text and config on mount
  useEffect(() => {
    const savedText = loadSavedText();
    const savedConfig = loadSavedConfig();

    if (savedText) {
      setText(savedText);
    }

    if (savedConfig) {
      setConfig((prev) => ({
        ...prev,
        ...savedConfig,
        // Don't restore visibility and position, only user preferences
        visible: prev.visible,
        position: prev.position,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save text to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (text) {
          localStorage.setItem(TELEPROMPTER_STORAGE_KEY, text);
        } else {
          localStorage.removeItem(TELEPROMPTER_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("Failed to save teleprompter text:", error);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [text]);

  // Save config to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const configToSave = {
          opacity: config.opacity,
          scrollSpeed: config.scrollSpeed,
          fontSize: config.fontSize,
          letterSpacing: config.letterSpacing,
          lineHeight: config.lineHeight,
          controlsCollapsed: config.controlsCollapsed,
          fontColor: config.fontColor,
        };
        localStorage.setItem(
          TELEPROMPTER_CONFIG_KEY,
          JSON.stringify(configToSave),
        );
      } catch (error) {
        console.warn("Failed to save teleprompter config:", error);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [
    config.opacity,
    config.scrollSpeed,
    config.fontSize,
    config.letterSpacing,
    config.lineHeight,
    config.controlsCollapsed,
    config.fontColor,
  ]);

  // Center teleprompter on first display and adjust size based on window
  const hasBeenCenteredRef = useRef(false);
  useEffect(() => {
    if (config.visible && !hasBeenCenteredRef.current) {
      hasBeenCenteredRef.current = true;

      // Calculate responsive width with proper margins
      const isMobile = window.innerWidth <= 768;
      const horizontalMargin = isMobile ? 32 : 80; // 16px or 40px on each side
      const maxWidth = Math.min(
        window.innerWidth - horizontalMargin,
        isMobile ? 600 : 800, // Max width cap
      );

      // Use calculated width or keep current if already customized
      const width = config.size.width === 400 ? maxWidth : config.size.width;
      const height = config.size.height;

      const centerX = (window.innerWidth - width) / 2;
      const centerY = (window.innerHeight - height) / 2;

      setConfig((prev) => ({
        ...prev,
        size: {
          width,
          height,
        },
        position: {
          x: centerX,
          y: centerY,
        },
      }));
    }
  }, [config.visible, config.size.width, config.size.height, setConfig]);

  // Delta-time based auto-scroll animation
  useEffect(() => {
    if (!config.visible || !isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
      scrollAccumulatorRef.current = 0; // Reset accumulator when stopped
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (contentRef.current) {
        const maxScroll =
          contentRef.current.scrollHeight - contentRef.current.clientHeight;
        if (maxScroll > 0) {
          // Accumulate scroll amount including fractional pixels
          scrollAccumulatorRef.current += delta * scrollSpeedRef.current;

          // Only update scrollTop when we have at least 0.1 pixels to scroll
          if (Math.abs(scrollAccumulatorRef.current) >= 0.1) {
            const scrollAmount =
              Math.floor(scrollAccumulatorRef.current * 10) / 10; // Round to 1 decimal
            const newScroll = Math.min(
              contentRef.current.scrollTop + scrollAmount,
              maxScroll,
            );
            contentRef.current.scrollTop = newScroll;

            // Keep the remainder for next frame
            scrollAccumulatorRef.current -= scrollAmount;

            if (newScroll >= maxScroll) {
              setIsPlaying(false);
              return;
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
      scrollAccumulatorRef.current = 0;
    };
  }, [config.visible, isPlaying]);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.preventDefault();
    // Capture pointer to ensure we receive all subsequent pointer events
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - config.position.x,
      y: e.clientY - config.position.y,
    });
  };

  const handleResizerPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture pointer to ensure we receive all subsequent pointer events
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDragging) {
        setConfig((prev) => ({
          ...prev,
          position: {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          },
        }));
      } else if (isResizing) {
        setConfig((prev) => ({
          ...prev,
          size: {
            width: Math.max(300, e.clientX - prev.position.x),
            height: Math.max(200, e.clientY - prev.position.y),
          },
        }));
      }
    },
    [isDragging, isResizing, dragOffset, setConfig],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handlePointerCancel = useCallback(() => {
    // Handle pointer cancellation (e.g., phone call, orientation change)
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
      };
    }
  }, [
    isDragging,
    isResizing,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  ]);

  const updateConfig = useCallback(
    (updates: Partial<TeleprompterConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    [setConfig],
  );

  const handleClose = () => {
    setIsPlaying(false);
    updateConfig({ visible: false });
  };

  const handlePlayPause = () => {
    if (!isPlaying && contentRef.current) {
      const maxScroll =
        contentRef.current.scrollHeight - contentRef.current.clientHeight;
      if (maxScroll <= 0 || contentRef.current.scrollTop >= maxScroll - 1) {
        contentRef.current.scrollTop = 0;
        scrollAccumulatorRef.current = 0; // Reset accumulator when restarting
      }
    }
    setIsPlaying((prev) => !prev);
  };

  const handleToggleSettings = () => {
    updateConfig({ controlsCollapsed: !config.controlsCollapsed });
  };

  // Prevent wheel events from bubbling to canvas when scrolling inside teleprompter
  const handleWheel = (e: React.WheelEvent) => {
    // Stop propagation to prevent canvas from scrolling
    e.stopPropagation();
  };

  if (!config.visible) {
    return null;
  }

  return (
    <div
      className="Teleprompter"
      style={{
        left: config.position.x,
        top: config.position.y,
        width: config.size.width,
        height: config.size.height,
        opacity: config.opacity,
      }}
      onWheel={handleWheel}
    >
      {/* Header — simplified with play button and settings icon */}
      <div
        className="Teleprompter__header"
        onPointerDown={handleHeaderPointerDown}
      >
        <button
          type="button"
          className={`Teleprompter__header-play-button ${
            isPlaying ? "Teleprompter__header-play-button--playing" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          title={
            isPlaying
              ? (t("recording.teleprompter.pause" as any) as string)
              : (t("recording.teleprompter.play" as any) as string)
          }
        >
          {isPlaying ? (
            <svg
              width="9"
              height="11"
              viewBox="0 0 10 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="3.5" height="12" rx="1" />
              <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg
              width="9"
              height="11"
              viewBox="0 0 10 12"
              fill="currentColor"
              aria-hidden="true"
              style={{ transform: "translateX(1px)" }}
            >
              <path d="M0 0 L10 6 L0 12 Z" />
            </svg>
          )}
        </button>
        <div className="Teleprompter__header-actions">
          <button
            type="button"
            className="Teleprompter__settings-button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSettings();
            }}
            title={config.controlsCollapsed ? "Show settings" : "Hide settings"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            className="Teleprompter__close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            title={t("recording.teleprompter.close" as any)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings panel - toggle via settings button */}
      {!config.controlsCollapsed && (
        <div className="Teleprompter__settings">
          <div className="Teleprompter__settings-grid">
            <div className="Teleprompter__setting-item">
              <label>Scroll Speed</label>
              <input
                type="range"
                min={10}
                max={200}
                value={config.scrollSpeed}
                onChange={(e) =>
                  updateConfig({ scrollSpeed: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="Teleprompter__setting-item">
              <label>Font Size</label>
              <input
                type="range"
                min={12}
                max={48}
                value={config.fontSize}
                onChange={(e) =>
                  updateConfig({ fontSize: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="Teleprompter__setting-item">
              <label>Letter Spacing</label>
              <input
                type="range"
                min={-0.05}
                max={0.2}
                step={0.01}
                value={config.letterSpacing}
                onChange={(e) =>
                  updateConfig({ letterSpacing: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="Teleprompter__setting-item">
              <label>Line Height</label>
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.1}
                value={config.lineHeight}
                onChange={(e) =>
                  updateConfig({ lineHeight: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="Teleprompter__setting-item">
              <label>Opacity</label>
              <input
                type="range"
                min={20}
                max={100}
                value={config.opacity * 100}
                onChange={(e) =>
                  updateConfig({ opacity: parseInt(e.target.value) / 100 })
                }
              />
            </div>
            <div className="Teleprompter__setting-item">
              <label>Text Color</label>
              <div className="Teleprompter__color-picker">
                {[
                  { color: "#000000", label: "Black" },
                  { color: "#334155", label: "Slate" },
                  { color: "#1e3a8a", label: "Blue" },
                  { color: "#166534", label: "Green" },
                  { color: "#7f1d1d", label: "Red" },
                  { color: "#ffffff", label: "White" },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    className={`Teleprompter__color-swatch ${
                      config.fontColor === color
                        ? "Teleprompter__color-swatch--active"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateConfig({ fontColor: color })}
                    title={label}
                    aria-label={`Select ${label} color`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content area — flex column; overflow switches per mode:
          edit: hidden (textarea scrolls itself)
          play: auto (container scrolls the text div) */}
      <div
        className="Teleprompter__content"
        ref={contentRef}
        style={{ overflowY: isPlaying ? "auto" : "hidden" }}
      >
        {isPlaying ? (
          <div
            className="Teleprompter__text"
            style={{
              fontSize: config.fontSize,
              letterSpacing: `${config.letterSpacing}em`,
              lineHeight: config.lineHeight,
              color: config.fontColor,
            }}
          >
            {text || (
              <span className="Teleprompter__placeholder">
                {t("recording.teleprompter.placeholder" as any)}
              </span>
            )}
          </div>
        ) : (
          <textarea
            className="Teleprompter__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("recording.teleprompter.placeholder" as any)}
            style={{
              fontSize: config.fontSize,
              letterSpacing: `${config.letterSpacing}em`,
              lineHeight: config.lineHeight,
              color: config.fontColor,
            }}
          />
        )}
        {!isPlaying && (
          <p className="Teleprompter__instructions">
            {t("recording.teleprompter.instructions" as any)}
          </p>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="Teleprompter__resizer"
        onPointerDown={handleResizerPointerDown}
      />
    </div>
  );
};
