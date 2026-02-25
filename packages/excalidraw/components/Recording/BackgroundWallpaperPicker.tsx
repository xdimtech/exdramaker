import React, { useState } from "react";

import type { WallpaperCategory } from "../../recording/types";

import { wallpapers, getWallpapersByCategory } from "../../assets/wallpapers";

import "./BackgroundWallpaperPicker.scss";

type BackgroundWallpaperPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const CATEGORIES: Array<{ value: WallpaperCategory; label: string }> = [
  { value: "all", label: "全部" },
  { value: "vibrant", label: "鲜艳" },
  { value: "soft", label: "柔和" },
  { value: "dark", label: "暗色" },
  { value: "nature", label: "自然" },
];

export const BackgroundWallpaperPicker = ({
  value,
  onChange,
}: BackgroundWallpaperPickerProps) => {
  const [activeCategory, setActiveCategory] =
    useState<WallpaperCategory>("all");

  const filteredWallpapers = getWallpapersByCategory(activeCategory);
  const handleRandomSelect = () => {
    if (!filteredWallpapers.length) {
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredWallpapers.length);
    const selected = filteredWallpapers[randomIndex];
    if (selected) {
      onChange(selected.id);
    }
  };

  return (
    <div className="BackgroundWallpaperPicker">
      {/* 分类标签 */}
      <div className="BackgroundWallpaperPicker__categories">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            type="button"
            className={`BackgroundWallpaperPicker__category ${
              activeCategory === category.value
                ? "BackgroundWallpaperPicker__category--active"
                : ""
            }`}
            onClick={() => setActiveCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="BackgroundWallpaperPicker__random"
        onClick={handleRandomSelect}
      >
        ✨ 随机选择壁纸
      </button>

      {/* 壁纸网格 */}
      <div className="BackgroundWallpaperPicker__grid">
        {/* 无背景选项 */}
        <button
          type="button"
          className={`BackgroundWallpaperPicker__item ${
            value === "none" ? "BackgroundWallpaperPicker__item--active" : ""
          }`}
          onClick={() => onChange("none")}
          title="无背景"
        >
          <div className="BackgroundWallpaperPicker__none-icon" />
        </button>

        {filteredWallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            type="button"
            className={`BackgroundWallpaperPicker__item ${
              value === wallpaper.id
                ? "BackgroundWallpaperPicker__item--active"
                : ""
            }`}
            onClick={() => onChange(wallpaper.id)}
            title={wallpaper.name}
          >
            <img
              src={wallpaper.thumbnail}
              alt={wallpaper.name}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
