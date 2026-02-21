import { Position, SpriteData } from './messageInterfaces';

export interface Entity {
  id: string;
  position: Position;
  image: ImageBitmap;
  width: number;
  height: number;
  spriteData: SpriteData;
  subEntities: Entity[];
}
