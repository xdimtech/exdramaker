import "@excalidraw/excalidraw/global";
import "@excalidraw/excalidraw/css";

declare global {
  interface Window {
    __EXCALIDRAW_SHA__: string | undefined;
    WeixinJSBridge?: {
      invoke: (
        method: string,
        params: Record<string, string>,
        callback: (response: { err_msg?: string }) => void,
      ) => void;
    };
  }
}
