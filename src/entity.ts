export interface Entity {
  x: number; // Game world coordinates
  y: number; // Game world coordinates
  image: ImageBitmap;
  scale: number; // Scale in game world units
  width: number; // Width in game world units
  height: number; // Height in game world units
  playerId?: string; // Optional player ID for remote players
  spriteVariant?: number; // Sprite variant for player
}
