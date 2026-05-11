export interface GameConfig {
  readonly gameWidth: number;
  readonly gameHeight: number;
  readonly movementSpeed: number;
  readonly dashSpeedMultiplier: number;
  readonly dashCooldownMs: number;
  readonly dashDurationMs: number;
  readonly positionUpdateIntervalMs: number;
  readonly meleeCooldownMs: number;
  readonly projectileCooldownMs: number;
  readonly specialCooldownMs: number;
  readonly sharedAttackCooldownMs: number;
  readonly specialRange: number;
}
