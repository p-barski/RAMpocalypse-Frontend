export interface GameConfig {
  readonly gameWidth: number;
  readonly gameHeight: number;
  readonly maxMovementSpeed: number;
  readonly positionUpdateIntervalMs: number;
  readonly meleeCooldownMs: number;
  readonly projectileCooldownMs: number;
  readonly specialCooldownMs: number;
  readonly specialRange: number;
}
