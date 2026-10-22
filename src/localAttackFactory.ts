import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';
import type { AttackEntity, Position } from './interfaces/messageInterfaces';
import { AttackTypeValue } from './interfaces/messageInterfaces';

function generateAttackId(now: number = Date.now()): string {
  return `attack_${now}_${crypto.randomUUID()}`;
}

export function getAttackPosition(player: Entity, sin?: number, cos?: number): Position {
  const angle = player.position.angle;
  sin = sin ?? Math.sin(angle);
  cos = cos ?? Math.cos(angle);
  const weapon = player.subEntities[0];
  if (!weapon) {
    return { x: player.position.x, y: player.position.y, angle: 0 };
  }
  // Weapon stays at its offset from the body and rotates around its bottom center, tip points where player faces
  const weaponHalfHeight = weapon.height / 2;
  return {
    x: player.position.x + weapon.position.x + weapon.height * sin,
    y: player.position.y + weapon.position.y + weaponHalfHeight - weapon.height * cos,
    angle: 0,
  };
}

export function createMeleeAttack(
  player: Entity,
  config: GameConfig,
  creationTime: number = Date.now(),
): AttackEntity[] {
  return [
    {
      id: generateAttackId(creationTime),
      ownerId: player.id,
      type: AttackTypeValue.Melee,
      currentPosition: getAttackPosition(player),
      velocityVector: { x: 0, y: 0, angle: 0 },
      lifetime: config.meleeLifetime,
      creationTime,
    },
  ];
}

export function createProjectileAttack(
  player: Entity,
  config: GameConfig,
  creationTime: number = Date.now(),
): AttackEntity[] {
  const angle = player.position.angle;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return [
    {
      id: generateAttackId(creationTime),
      ownerId: player.id,
      type: AttackTypeValue.Projectile,
      currentPosition: getAttackPosition(player, sin, cos),
      velocityVector: { x: sin * config.projectileSpeed, y: -cos * config.projectileSpeed, angle: 0 },
      lifetime: config.projectileLifetime,
      creationTime,
    },
  ];
}

export function createSpecialAttack(
  player: Entity,
  config: GameConfig,
  creationTime: number = Date.now(),
): AttackEntity[] {
  const angle = player.position.angle;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return [
    {
      id: generateAttackId(creationTime),
      ownerId: player.id,
      type: AttackTypeValue.Special,
      currentPosition: getAttackPosition(player, sin, cos),
      velocityVector: { x: sin * config.specialSpeed, y: -cos * config.specialSpeed, angle: 0 },
      lifetime: config.specialLifetime,
      creationTime,
    },
  ];
}
