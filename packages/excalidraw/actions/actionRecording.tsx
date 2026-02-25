import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { register } from "./register";

import type { AppState } from "../types";

export const actionOpenRecordingDialog = register({
  name: "openRecordingDialog",
  label: "recording.openDialog",
  viewMode: false,
  trackEvent: { category: "menu" },
  perform: (
    _elements: readonly ExcalidrawElement[],
    appState: Readonly<AppState>,
  ) => ({
    appState: { ...appState, openDialog: { name: "recording" } },
    captureUpdate: CaptureUpdateAction.NEVER,
  }),
  keyTest: (event: KeyboardEvent) =>
    event.key.toLowerCase() === "r" &&
    event.shiftKey &&
    (event.ctrlKey || event.metaKey),
} as any);
