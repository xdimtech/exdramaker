import React, { useEffect, useMemo, useState, useRef } from "react";

import { t } from "../i18n";

import { useAtom } from "../editor-jotai";

import {
  recordingConfigAtom,
  recordingStatusAtom,
  recordingDurationAtom,
} from "../recording/recordingState";
import { saveAspectRatio } from "../recording/types";

import { Dialog } from "./Dialog";
import { RecordingPreview } from "./Recording/RecordingPreview";
import { AspectRatioSelector } from "./Recording/AspectRatioSelector";
import { BackgroundWallpaperPicker } from "./Recording/BackgroundWallpaperPicker";
import { Switch } from "./Switch";

import { FilledButton } from "./FilledButton";

import "./RecordingDialog.scss";

type RecordingDialogProps = {
  onCloseRequest: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export const RecordingDialog = ({ onCloseRequest }: RecordingDialogProps) => {
  const [config, setConfig] = useAtom(recordingConfigAtom);
  const [status] = useAtom(recordingStatusAtom);
  const [duration] = useAtom(recordingDurationAtom);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) {
      return;
    }

    let isMounted = true;

    const loadDevices = async () => {
      try {
        const devices = await mediaDevices.enumerateDevices();
        if (!isMounted) {
          return;
        }
        setMicrophones(
          devices.filter((device) => device.kind === "audioinput"),
        );
      } catch (error) {
        console.error("Failed to enumerate audio devices:", error);
      }
    };

    const requestPermission = async () => {
      if (!mediaDevices.getUserMedia) {
        await loadDevices();
        return;
      }

      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.warn("Microphone permission not granted:", error);
      }

      await loadDevices();
    };

    void requestPermission();

    const handleDeviceChange = () => {
      void loadDevices();
    };

    mediaDevices.addEventListener?.("devicechange", handleDeviceChange);

    return () => {
      isMounted = false;
      mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, []);

  const microphoneOptions = useMemo(() => {
    const options = microphones.map((device, index) => {
      const fallbackLabel =
        device.deviceId === "default"
          ? t("recording.microphoneDefault" as any)
          : `${t("recording.microphone" as any)} ${index + 1}`;
      return {
        id: device.deviceId,
        label: device.label || fallbackLabel,
      };
    });

    if (
      config.microphone &&
      !options.some((option) => option.id === config.microphone)
    ) {
      options.unshift({
        id: config.microphone,
        label: t("recording.microphoneUnavailable" as any),
      });
    }

    return options;
  }, [microphones, config.microphone]);

  return (
    <Dialog
      size="wide"
      className="RecordingDialog__dialog"
      onCloseRequest={onCloseRequest}
      title={false}
    >
      <div className="RecordingDialog">
        {/* 左侧预览区 */}
        <div className="RecordingDialog__preview">
          <RecordingPreview config={config} />
          <div className="RecordingDialog__preview-label">预览</div>
          {status === "recording" && (
            <div className="RecordingDialog__preview-status">
              <span className="RecordingDialog__preview-status-indicator" />
              <span className="RecordingDialog__preview-status-duration">
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* 右侧设置面板 */}
        <div className="RecordingDialog__settings">
          <div className="RecordingDialog__settings-inner">
            {/* 画面比例 */}
            <div className="RecordingDialog__section">
              <h3>{t("recording.aspectRatio" as any)}</h3>
              <AspectRatioSelector
                value={config.aspectRatio}
                onChange={(aspectRatio) => {
                  // 保存到localStorage
                  saveAspectRatio(aspectRatio);
                  setConfig({
                    ...config,
                    aspectRatio,
                    customAspectRatio:
                      aspectRatio === "custom"
                        ? config.customAspectRatio || { width: 16, height: 9 }
                        : config.customAspectRatio,
                  });
                }}
              />
              {config.aspectRatio === "custom" && (
                <div className="RecordingDialog__ratio-inputs">
                  <input
                    className="RecordingDialog__ratio-input"
                    type="number"
                    min={1}
                    value={config.customAspectRatio?.width ?? 16}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        customAspectRatio: {
                          width: Math.max(
                            1,
                            parseInt(e.target.value || "1", 10),
                          ),
                          height: config.customAspectRatio?.height ?? 9,
                        },
                      })
                    }
                  />
                  <span className="RecordingDialog__ratio-separator">:</span>
                  <input
                    className="RecordingDialog__ratio-input"
                    type="number"
                    min={1}
                    value={config.customAspectRatio?.height ?? 9}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        customAspectRatio: {
                          width: config.customAspectRatio?.width ?? 16,
                          height: Math.max(
                            1,
                            parseInt(e.target.value || "1", 10),
                          ),
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* 背景壁纸 */}
            <div className="RecordingDialog__section">
              <h3>{t("recording.background" as any)}</h3>
              <BackgroundWallpaperPicker
                value={config.background}
                onChange={(background) => setConfig({ ...config, background })}
              />
            </div>

            {/* 圆角半径 */}
            <div className="RecordingDialog__section">
              <h3 className="RecordingDialog__section-title">
                <span>{t("recording.borderRadius" as any)}</span>
                <span className="RecordingDialog__section-value">
                  {config.borderRadius}px
                </span>
              </h3>
              <input
                type="range"
                className="RecordingDialog__slider"
                min={0}
                max={40}
                value={config.borderRadius}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    borderRadius: parseInt(e.target.value),
                  })
                }
              />
            </div>

            {/* 画布边距 */}
            <div className="RecordingDialog__section">
              <h3 className="RecordingDialog__section-title">
                <span>{t("recording.padding" as any)}</span>
                <span className="RecordingDialog__section-value">
                  {config.padding}px
                </span>
              </h3>
              <input
                type="range"
                className="RecordingDialog__slider"
                min={0}
                max={120}
                value={config.padding}
                onChange={(e) =>
                  setConfig({ ...config, padding: parseInt(e.target.value) })
                }
              />
            </div>

            {/* 摄像头 */}
            <div className="RecordingDialog__section RecordingDialog__section--horizontal">
              <label htmlFor="enableCamera">
                {t("recording.enableCamera" as any)}
              </label>
              <Switch
                name="enableCamera"
                checked={config.camera.enabled}
                onChange={(enabled) =>
                  setConfig({
                    ...config,
                    camera: { ...config.camera, enabled },
                  })
                }
              />
            </div>

            {config.camera.enabled && (
              <>
                <div className="RecordingDialog__section">
                  <h3 className="RecordingDialog__section-title">
                    <span>{t("recording.cameraSize" as any)}</span>
                    <span className="RecordingDialog__section-value">
                      {config.camera.size}px
                    </span>
                  </h3>
                  <input
                    type="range"
                    className="RecordingDialog__slider"
                    min={100}
                    max={300}
                    value={config.camera.size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        camera: {
                          ...config.camera,
                          size: parseInt(e.target.value, 10),
                        },
                      })
                    }
                  />
                  <div className="RecordingDialog__slider-labels">
                    <span>{t("recording.sizeSmall" as any)}</span>
                    <span>{t("recording.sizeLarge" as any)}</span>
                  </div>
                </div>

                <div className="RecordingDialog__section">
                  <h3 className="RecordingDialog__section-title">
                    <span>{t("recording.cameraZoom" as any)}</span>
                    <span className="RecordingDialog__section-value">
                      {(config.camera.zoom || 1).toFixed(1)}x
                    </span>
                  </h3>
                  <input
                    type="range"
                    className="RecordingDialog__slider"
                    min={1}
                    max={2}
                    step={0.1}
                    value={config.camera.zoom || 1}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        camera: {
                          ...config.camera,
                          zoom: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                  <div className="RecordingDialog__slider-labels">
                    <span>1x</span>
                    <span>2x</span>
                  </div>
                </div>
              </>
            )}

            {/* 麦克风 */}
            <div className="RecordingDialog__section">
              <h3>{t("recording.microphone" as any)}</h3>
              <CustomSelect
                value={config.microphone ?? ""}
                options={[
                  { value: "", label: t("recording.microphoneOff" as any) },
                  ...microphoneOptions.map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  })),
                ]}
                onChange={(value) =>
                  setConfig({
                    ...config,
                    microphone: value || null,
                  })
                }
              />
            </div>

            {/* 光标高亮 */}
            <div className="RecordingDialog__section RecordingDialog__section--horizontal">
              <label htmlFor="enableCursor">
                {t("recording.enableCursor" as any)}
              </label>
              <Switch
                name="enableCursor"
                checked={config.cursor.enabled}
                onChange={(enabled) =>
                  setConfig({
                    ...config,
                    cursor: { ...config.cursor, enabled },
                  })
                }
              />
            </div>
          </div>

          <div className="RecordingDialog__footer">
            <button
              className="RecordingDialog__cancel-btn"
              onClick={onCloseRequest}
            >
              取消
            </button>
            <FilledButton
              size="large"
              onClick={onCloseRequest}
              label={t("recording.saveSettings" as any)}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
};

type SelectOption = {
  value: string;
  label: string;
};

const CustomSelect = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="CustomSelect" ref={containerRef}>
      <button
        type="button"
        className={`CustomSelect__trigger ${
          isOpen ? "CustomSelect__trigger--open" : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="CustomSelect__value">
          {selectedOption?.label || "选择..."}
        </span>
        <span className="CustomSelect__arrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="CustomSelect__dropdown">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`CustomSelect__option ${
                option.value === value ? "CustomSelect__option--selected" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
