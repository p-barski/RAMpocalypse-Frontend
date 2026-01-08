export class ResourceLoader {
  private static imageCache: Map<string, ImageBitmap> = new Map();
  private static audioCache: Map<string, HTMLAudioElement> = new Map();

  static async loadImage(path: string): Promise<ImageBitmap> {
    // Check cache first
    if (this.imageCache.has(path)) {
      return this.imageCache.get(path)!;
    }

    const response = await fetch(path);

    if (!response.ok) {
      throw new Error('Failed to load image');
    }

    const blob = await response.blob();
    return await createImageBitmap(blob);
  }

  static async loadAudio(path: string): Promise<HTMLAudioElement> {
    // Check cache first
    if (this.audioCache.has(path)) {
      return this.audioCache.get(path)!;
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      audio.oncanplaythrough = () => {
        this.audioCache.set(path, audio);
        resolve(audio);
      };
      audio.onerror = () => {
        reject(new Error(`Failed to load audio: ${path}`));
      };
      audio.load();
    });
  }

  static clearCache(): void {
    this.imageCache.clear();
    this.audioCache.clear();
  }
}
