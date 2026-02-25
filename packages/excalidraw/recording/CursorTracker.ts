export class CursorTracker {
  private cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private listeners: Array<() => void> = [];

  start(canvas: HTMLCanvasElement): void {
    const handleMove = (event: MouseEvent | PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.cursorPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("pointermove", handleMove);

    this.listeners.push(() => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("pointermove", handleMove);
    });
  }

  getPosition(): { x: number; y: number } {
    return this.cursorPosition;
  }

  stop(): void {
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners = [];
  }
}
