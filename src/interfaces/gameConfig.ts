export interface GameConfig {
  readonly gameWidth: number;
  readonly gameHeight: number;
  readonly movementSpeed: number;
  readonly rotationSpeedRadPerSec: number;
  readonly dashSpeedMultiplier: number;
  readonly dashCooldownMs: number;
  readonly dashDurationMs: number;
  readonly positionUpdateIntervalMs: number;
  readonly meleeCooldownMs: number;
  readonly projectileCooldownMs: number;
  readonly specialCooldownMs: number;
  readonly sharedAttackCooldownMs: number;
  readonly specialRange: number;
  readonly meleeRange: number;
  readonly projectileSpeed: number;
  readonly specialSpeed: number;
  readonly meleeLifetime: number;
  readonly projectileLifetime: number;
  readonly specialLifetime: number;
  readonly meleeDamage: number;
  readonly projectileDamage: number;
  readonly specialDamage: number;
  readonly respawnCooldownMs: number;
  readonly spawnProtectionMs: number;
}
