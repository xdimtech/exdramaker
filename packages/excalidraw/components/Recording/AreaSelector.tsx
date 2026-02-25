import React, { useState, useEffect, useCallback } from "react";

import type { AreaSelection } from "../../recording/recordingState";

import "./AreaSelector.scss";

interface AreaSelectorProps {
  onAreaSelected: (area: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
  canvasBounds: DOMRect;
  aspectRatio?: number;
}

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const AreaSelector = ({
  onAreaSelected,
  onCancel,
  canvasBounds,
  aspectRatio,
}: AreaSelectorProps) => {
  const [selection, setSelection] = useState<AreaSelection>({
    active: true,
    startPoint: null,
    endPoint: null,
    selectedArea: null,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {
      return;
    } // 只处理左键

    const x = clampValue(e.clientX - canvasBounds.left, 0, canvasBounds.width);
    const y = clampValue(e.clientY - canvasBounds.top, 0, canvasBounds.height);

    setSelection({
      active: true,
      startPoint: { x, y },
      endPoint: { x, y },
      selectedArea: null,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!selection.startPoint) {
        return;
      }

      const x = clampValue(
        e.clientX - canvasBounds.left,
        0,
        canvasBounds.width,
      );
      const y = clampValue(
        e.clientY - canvasBounds.top,
        0,
        canvasBounds.height,
      );

      const startX = selection.startPoint!.x;
      const startY = selection.startPoint!.y;
      let deltaX = x - startX;
      let deltaY = y - startY;

      if (aspectRatio && aspectRatio > 0) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absY === 0) {
          deltaY = (absX / aspectRatio) * Math.sign(deltaY || 1);
        } else if (absX / absY > aspectRatio) {
          deltaX = absY * aspectRatio * Math.sign(deltaX || 1);
        } else {
          deltaY = (absX / aspectRatio) * Math.sign(deltaY || 1);
        }
      }

      const endX = startX + deltaX;
      const endY = startY + deltaY;

      setSelection((prev) => ({
        ...prev,
        endPoint: { x: endX, y: endY },
        selectedArea: {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(deltaX),
          height: Math.abs(deltaY),
        },
      }));
    },
    [selection.startPoint, canvasBounds, aspectRatio],
  );

  const handleMouseUp = useCallback(() => {
    if (
      selection.selectedArea &&
      selection.selectedArea.width > 10 &&
      selection.selectedArea.height > 10
    ) {
      onAreaSelected(selection.selectedArea);
    }
  }, [selection.selectedArea, onAreaSelected]);

  useEffect(() => {
    if (selection.active && selection.startPoint) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [selection.active, selection.startPoint, handleMouseMove, handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className="AreaSelector"
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {selection.selectedArea && (
        <div
          className="AreaSelector__selection"
          style={{
            left: selection.selectedArea.x,
            top: selection.selectedArea.y,
            width: selection.selectedArea.width,
            height: selection.selectedArea.height,
          }}
        >
          <div className="AreaSelector__selection-info">
            {Math.round(selection.selectedArea.width)} ×{" "}
            {Math.round(selection.selectedArea.height)}
          </div>
        </div>
      )}
      <div className="AreaSelector__instructions">
        拖拽以选择录制区域，按 ESC 取消
      </div>
    </div>
  );
};
