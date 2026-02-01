import { Position, SpriteData } from './messageInterfaces';

export interface Entity {
  position: Position;
  image: ImageBitmap;
  width: number;
  height: number;
  playerId: string;
  spriteData: SpriteData;
}
