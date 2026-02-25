/**
 * MP4Encoder - 封装 MP4 编码逻辑
 *
 * 策略：
 * 1. 优先使用原生 MediaRecorder API (video/mp4)
 * 2. 如果不支持，降级为 video/webm
 */

export class MP4Encoder {
  private static checkMP4Support(): boolean {
    // 检查浏览器是否支持 MP4 编码
    if (!MediaRecorder.isTypeSupported) {
      return false;
    }

    const mp4Types = [
      "video/mp4",
      "video/mp4;codecs=h264",
      "video/mp4;codecs=avc1",
    ];

    return mp4Types.some((type) => MediaRecorder.isTypeSupported(type));
  }

  static getSupportedMimeType(): string {
    // 优先级顺序
    const mimeTypes = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported?.(mimeType)) {
        return mimeType;
      }
    }

    // 降级到默认
    return "video/webm";
  }

  static getFileExtension(mimeType: string): string {
    if (mimeType.includes("mp4")) {
      return "mp4";
    }
    if (mimeType.includes("webm")) {
      return "webm";
    }
    return "mp4"; // 默认
  }

  static async createRecorder(
    stream: MediaStream,
    options?: MediaRecorderOptions,
  ): Promise<MediaRecorder> {
    const mimeType = this.getSupportedMimeType();

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps
      ...options,
    });

    return recorder;
  }

  static isMP4Supported(): boolean {
    return this.checkMP4Support();
  }
}
