export interface SpriteManager {
  getSpriteForVariant(variant: number): Promise<ImageBitmap>;
}
