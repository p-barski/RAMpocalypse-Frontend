export interface Position {
  x: number;
  y: number;
  angle: number;
}

export interface SpriteData {
  url: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface SubEntity {
  position: Position;
  spriteData: SpriteData;
  id: string;
  subEntities: SubEntity[];
}

export interface Player {
  id: string;
  position: Position;
  spriteData: SpriteData;
  subEntities: SubEntity[];
  health: number;
  maxHealth: number;
  isAlive: boolean;
}

export enum AttackType {
  Melee = 0,
  Projectile = 1,
  Special = 2,
}
