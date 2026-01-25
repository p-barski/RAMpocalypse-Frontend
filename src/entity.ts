import { Position, SpriteData } from './messageInterfaces';

export interface Entity {
  position: Position; // Game world coordinates
  image: ImageBitmap;
  scale: number; // Scale in game world units
  width: number; // Width in game world units
  height: number; // Height in game world units
  playerId: string; // Player ID for remote players
  spriteData: SpriteData; // Sprite data for player
}
