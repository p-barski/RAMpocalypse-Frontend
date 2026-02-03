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

export interface Player {
  id: string;
  position: Position;
  spriteData: SpriteData;
  health: number;
  maxHealth: number;
  isAlive: boolean;
}

export enum AttackType {
  Melee = 0,
  Projectile = 1,
  Special = 2,
}
