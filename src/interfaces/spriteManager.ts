import { SpriteData } from '../messageInterfaces';

export interface SpriteManager {
  getSpriteForVariant(spriteData: SpriteData): Promise<ImageBitmap>;
}
