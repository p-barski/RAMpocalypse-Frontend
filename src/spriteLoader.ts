import { SpriteManager } from './interfaces/spriteManager';
import { SpriteData } from './messageInterfaces';
import { ResourceLoader } from './resourceLoader';

export class SpriteLoader implements SpriteManager {
  private readonly serverUrl: string;
  private readonly spriteCache: Map<string, ImageBitmap> = new Map();
  private readonly fallbackImage: ImageBitmap;

  constructor(serverUrl: string, fallbackImage: ImageBitmap) {
    this.serverUrl = serverUrl;
    this.fallbackImage = fallbackImage;
  }

  async getSpriteForVariant(spriteData: SpriteData): Promise<ImageBitmap> {
    // Check cache first
    const cached = this.spriteCache.get(spriteData.url);
    if (cached) {
      return cached;
    }

    // Load sprite from backend server
    const spritePath = spriteData.url;
    try {
      const sprite = await ResourceLoader.loadImage(spritePath);
      if (sprite && sprite.width > 0) {
        this.spriteCache.set(spriteData.url, sprite);
        return sprite;
      } else {
        throw new Error('Image failed to load properly');
      }
    } catch (error) {
      console.warn(`Failed to load sprite variant ${spriteData.url}. `, error);
      // If variant 1 also fails, use fallback image as last resort
      if (this.fallbackImage) {
        return this.fallbackImage;
      }
      // Last resort: create a placeholder image
      const placeholder = await createImageBitmap(new ImageData(64, 32));
      return placeholder;
    }
  }
}
