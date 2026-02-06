import { SpriteManager } from './interfaces/spriteManager';
import { SpriteData } from './messageInterfaces';
import { ResourceLoader } from './resourceLoader';

export class SpriteLoader implements SpriteManager {
  private readonly spriteCache: Map<string, ImageBitmap> = new Map();
  private readonly fallbackImage: ImageBitmap;

  constructor(fallbackImage: ImageBitmap) {
    this.fallbackImage = fallbackImage;
  }

  async getSpriteForVariant(spriteData: SpriteData): Promise<ImageBitmap> {
    const cached = this.spriteCache.get(spriteData.url);
    if (cached) return cached;

    try {
      const sprite = await ResourceLoader.loadImage(spriteData.url);
      if (sprite && sprite.width > 0) {
        this.spriteCache.set(spriteData.url, sprite);
        return sprite;
      }
    } catch (error) {
      console.warn(`Failed to load sprite variant ${spriteData.url}. `, error);
    }
    return this.fallbackImage;
  }
}
