import { SpriteData } from '../messageInterfaces';

export interface SpriteManager {
  getSpriteImage(spriteData: SpriteData): Promise<ImageBitmap>;
}
