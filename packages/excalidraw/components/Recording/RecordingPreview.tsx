import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RecordingConfig } from "../../recording/types";

import { RECORDING_RESOLUTIONS } from "../../recording/types";
import { getWallpaperById } from "../../assets/wallpapers";

import "./RecordingPreview.scss";

type RecordingPreviewProps = {
  config: RecordingConfig;
};

export const RecordingPreview = ({ config }: RecordingPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const aspectRatio =
    config.aspectRatio === "custom" && config.customAspectRatio
      ? config.customAspectRatio.width / config.customAspectRatio.height
      : RECORDING_RESOLUTIONS[
          config.aspectRatio as Exclude<typeof config.aspectRatio, "custom">
        ].width /
        RECORDING_RESOLUTIONS[
          config.aspectRatio as Exclude<typeof config.aspectRatio, "custom">
        ].height;

  const baseResolution =
    config.aspectRatio === "custom"
      ? {
          width: aspectRatio * 1080,
          height: 1080,
        }
      : RECORDING_RESOLUTIONS[
          config.aspectRatio as Exclude<typeof config.aspectRatio, "custom">
        ];

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      setContainerSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const availableWidth = containerSize.width || 260;
  const availableHeight = containerSize.height || 360;
  const frameWidth = Math.min(availableWidth, availableHeight * aspectRatio);
  const frameHeight = frameWidth / aspectRatio;
  const scale = frameWidth / baseResolution.width;
  const padding = Math.max(4, config.padding * scale);
  const cardWidth = Math.max(0, frameWidth - padding * 2);
  const cardHeight = Math.max(0, frameHeight - padding * 2);
  const cardRadius = Math.max(0, Math.min(config.borderRadius * scale, 28));
  const wallpaper = getWallpaperById(config.background);
  const cameraSize = Math.max(
    16,
    Math.min(90, config.camera.size * scale, cardWidth * 0.4, cardHeight * 0.4),
  );
  const [backgroundKey, setBackgroundKey] = useState(0);

  useEffect(() => {
    setBackgroundKey((prev) => prev + 1);
  }, [aspectRatio, config.background]);

  return (
    <div className="RecordingPreview" ref={containerRef}>
      <div
        className="RecordingPreview__frame"
        style={{
          width: frameWidth,
          height: frameHeight,
        }}
      >
        <div
          key={backgroundKey}
          className="RecordingPreview__frame-bg"
          style={{
            backgroundImage: wallpaper ? `url(${wallpaper.src})` : undefined,
          }}
        />
        <div
          className="RecordingPreview__card"
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: cardRadius,
          }}
        >
          <div className="RecordingPreview__line RecordingPreview__line--long" />
          <div className="RecordingPreview__line RecordingPreview__line--medium" />
          <div className="RecordingPreview__line RecordingPreview__line--short" />
          <div className="RecordingPreview__dot RecordingPreview__dot--pink" />
          {config.camera.enabled && (
            <div
              className="RecordingPreview__dot RecordingPreview__dot--gray"
              style={{ width: cameraSize, height: cameraSize }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
