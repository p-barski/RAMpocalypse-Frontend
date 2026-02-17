import { SpriteManager } from './interfaces/spriteManager';
import { SpriteData } from './messageInterfaces';

export class SpriteLoader implements SpriteManager {
  private readonly spriteCache: Map<string, ImageBitmap> = new Map();
  private readonly missingSprite: ImageBitmap;

  constructor(missingSprite: ImageBitmap) {
    this.missingSprite = missingSprite;
  }

  async getSpriteImage(spriteData: SpriteData): Promise<ImageBitmap> {
    const cached = this.spriteCache.get(spriteData.url);
    if (cached) return cached;

    const sprite = await SpriteLoader.loadSprite(spriteData.url);
    if (sprite) {
      this.spriteCache.set(spriteData.url, sprite);
      return sprite;
    }
    // TODO extend missing sprite image to match sprite size
    return this.missingSprite;
  }

  static async loadSprite(url: string): Promise<ImageBitmap | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to load sprite '${url}'.`);
        return null;
      }
      const blob = await response.blob();
      const sprite = await createImageBitmap(blob);
      if (sprite) {
        return sprite;
      }
    } catch (error) {
      console.warn(`Failed to load sprite '${url}'. `, error);
    }
    return null;
  }

  static async loadMissingSprite(): Promise<ImageBitmap> {
    return (await SpriteLoader.loadSprite('missing_sprite.png')) ?? (await createImageBitmap(new ImageData(32, 32)));
  }
}
