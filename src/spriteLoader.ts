import type { SpriteManager } from './interfaces/spriteManager';
import type { SpriteData } from './interfaces/messageInterfaces';

export class SpriteLoader implements SpriteManager {
  private readonly spriteCache: Map<string, ImageBitmap> = new Map();
  private readonly missingSpriteCache: Map<string, ImageBitmap> = new Map();
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

    const targetWidth = Math.max(1, spriteData.width);
    const targetHeight = Math.max(1, spriteData.height);
    const cacheKey = `${targetWidth}x${targetHeight}`;
    const cachedMissingSprite = this.missingSpriteCache.get(cacheKey);
    if (cachedMissingSprite) return cachedMissingSprite;

    if (targetWidth === this.missingSprite.width && targetHeight === this.missingSprite.height)
      return this.missingSprite;

    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(targetWidth, targetHeight)
        : Object.assign(document.createElement('canvas'), { width: targetWidth, height: targetHeight });
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.missingSprite;

    for (let y = 0; y < targetHeight; y += this.missingSprite.height) {
      for (let x = 0; x < targetWidth; x += this.missingSprite.width) {
        const sw = Math.min(this.missingSprite.width, targetWidth - x);
        const sh = Math.min(this.missingSprite.height, targetHeight - y);
        ctx.drawImage(this.missingSprite, 0, 0, sw, sh, x, y, sw, sh);
      }
    }

    const missingSprite = await createImageBitmap(canvas);
    this.missingSpriteCache.set(cacheKey, missingSprite);
    return missingSprite;
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
    return (
      (await SpriteLoader.loadSprite('/app/missing_sprite.png')) ?? (await createImageBitmap(new ImageData(32, 32)))
    );
  }
}
