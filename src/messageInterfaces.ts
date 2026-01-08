export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Position;
  spriteVariant?: number;
  health?: number;
  maxHealth?: number;
  isAlive?: boolean;
}

export enum AttackType {
  Melee = 0,
  Projectile = 1,
  Special = 2,
}
