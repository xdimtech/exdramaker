import React, { useState, useEffect, useRef, useCallback } from "react";

import { useAtom } from "../../editor-jotai";
import {
  teleprompterConfigAtom,
  teleprompterTextAtom,
} from "../../recording/recordingState";
import { t } from "../../i18n";
import { file as fileIcon } from "../icons";

import "./Teleprompter.scss";

import type { TeleprompterConfig } from "../../recording/recordingState";

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
  scrollSpeedRef.current = config.scrollSpeed;

  // Delta-time based auto-scroll animation
  useEffect(() => {
    if (!config.visible || !isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
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
          const newScroll = Math.min(
            contentRef.current.scrollTop + delta * scrollSpeedRef.current,
            maxScroll,
          );
          contentRef.current.scrollTop = newScroll;
          if (newScroll >= maxScroll) {
            setIsPlaying(false);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
    };
  }, [config.visible, isPlaying]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - config.position.x,
      y: e.clientY - config.position.y,
    });
    e.preventDefault();
  };

  const handleResizerMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
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

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
      }
    }
    setIsPlaying((prev) => !prev);
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
    >
      {/* Header — drag from here */}
      <div className="Teleprompter__header" onMouseDown={handleHeaderMouseDown}>
        <div className="Teleprompter__title-area">
          <span className="Teleprompter__title-icon">{fileIcon}</span>
          <span className="Teleprompter__title">
            {t("recording.teleprompter.title" as any)}
          </span>
        </div>
        <button
          type="button"
          className="Teleprompter__close"
          onClick={handleClose}
          title={t("recording.teleprompter.close" as any)}
        >
          ✕
        </button>
      </div>

      {/* Controls row: play button + sliders on one line */}
      <div className="Teleprompter__controls">
        <button
          type="button"
          className={`Teleprompter__play-button ${
            isPlaying ? "Teleprompter__play-button--playing" : ""
          }`}
          onClick={handlePlayPause}
          title={
            isPlaying
              ? (t("recording.teleprompter.pause" as any) as string)
              : (t("recording.teleprompter.play" as any) as string)
          }
        >
          {isPlaying ? (
            // Pause: two vertical bars — precisely centered in the button
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="3.5" height="12" rx="1" />
              <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            // Play: triangle — shifted 1px right for optical centering of the
            // visual mass (triangle is bottom-heavy; aligning centroid, not bbox)
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="currentColor"
              aria-hidden="true"
              style={{ transform: "translateX(1px)" }}
            >
              <path d="M0 0 L10 6 L0 12 Z" />
            </svg>
          )}
        </button>

        <div className="Teleprompter__sliders">
          <div className="Teleprompter__slider-row">
            <label>{t("recording.teleprompter.scrollSpeed" as any)}</label>
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
          <div className="Teleprompter__slider-row">
            <label>{t("recording.teleprompter.opacity" as any)}</label>
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
        </div>
      </div>

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
            style={{ fontSize: config.fontSize }}
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
            style={{ fontSize: config.fontSize }}
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
        onMouseDown={handleResizerMouseDown}
      />
    </div>
  );
};
