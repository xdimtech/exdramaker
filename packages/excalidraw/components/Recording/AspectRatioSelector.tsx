import React from "react";

import type { AspectRatio } from "../../recording/types";

import "./AspectRatioSelector.scss";

type AspectRatioSelectorProps = {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
};

const ASPECT_RATIOS: Array<{
  value: AspectRatio;
  label: string;
  description: string;
}> = [
  { value: "16:9", label: "16:9", description: "YouTube" },
  { value: "4:3", label: "4:3", description: "Traditional" },
  { value: "9:16", label: "9:16", description: "抖音/TikTok" },
  { value: "3:4", label: "3:4", description: "小红书" },
  { value: "1:1", label: "1:1", description: "Instagram" },
  { value: "custom", label: "自定义", description: "Custom" },
];

export const AspectRatioSelector = ({
  value,
  onChange,
}: AspectRatioSelectorProps) => {
  return (
    <div className="AspectRatioSelector">
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio.value}
          type="button"
          className={`AspectRatioSelector__button ${
            value === ratio.value ? "AspectRatioSelector__button--active" : ""
          }`}
          onClick={() => onChange(ratio.value)}
        >
          <span className="AspectRatioSelector__button-label">
            {ratio.label}
          </span>
          <span className="AspectRatioSelector__button-description">
            {ratio.description}
          </span>
        </button>
      ))}
    </div>
  );
};
