import React from "react";

import { useSlides } from "../hooks/useSlides";
import { PlusIcon } from "./icons";
import { t } from "../i18n";

import "./SlideTrigger.scss";

export const SlideTrigger = () => {
  const { createSlide } = useSlides();

  const handleAddSlide = () => {
    createSlide();
  };

  return (
    <button
      className="slide-trigger-floating"
      onClick={handleAddSlide}
      title={t("slides.add")}
    >
      {PlusIcon}
    </button>
  );
};

export default SlideTrigger;
