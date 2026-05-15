import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { EntityAnimationController } from './entityAnimationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Entity } from './interfaces/entity';
import { createMockEntityManager, MockGameConfig, MockTime } from './testHelpers/mocks';
import { createTestLocalPlayerWithWeapon } from './testHelpers/entityTestFactories';

function createPlayerAndWeapon(angle: number, weaponHeight = 16): { player: Entity; weapon: Entity } {
  const player = createTestLocalPlayerWithWeapon();
  const weapon = player.subEntities[0];
  weapon.position.x = 500;
  weapon.position.y = 500;
  weapon.position.angle = angle;
  weapon.height = weaponHeight;
  return { player, weapon };
}

function getMeleeAnimatedAtHalfProgress(
  sut: EntityAnimationController,
  mockEntityManager: Mocked<EntityManager>,
  mockTime: MockTime,
  mockGameConfig: MockGameConfig,
  weapon: Entity,
  player: Entity,
): Entity {
  mockEntityManager.getEntityById.mockReturnValue(player);
  sut.createMeleeAttackAnimation('');
  mockTime.frameTimestamp = 0.5 * mockGameConfig.sharedAttackCooldownMs;
  return sut.getAnimatedEntity(weapon);
}

function assertProjectileKeyframes(
  sut: EntityAnimationController,
  mockTime: MockTime,
  mockGameConfig: MockGameConfig,
  weapon: Entity,
  direction: 'up' | 'down',
) {
  const fivePercentOfWeaponHeight = weapon.height! * 0.05;
  const sign = direction === 'up' ? -1 : 1;
  const timesAndOffsets = [
    { time: 0.125, offset: sign * 2 * fivePercentOfWeaponHeight },
    { time: 0.25, offset: sign * 3 * fivePercentOfWeaponHeight },
    { time: 0.5, offset: sign * 2 * fivePercentOfWeaponHeight },
    { time: 0.75, offset: sign * fivePercentOfWeaponHeight },
    { time: 1, offset: 0 },
  ];
  for (const { time, offset } of timesAndOffsets) {
    mockTime.frameTimestamp = mockGameConfig.sharedAttackCooldownMs * time;
    const animatedEntity = sut.getAnimatedEntity(weapon);
    expect(animatedEntity.position.x).toStrictEqual(weapon.position.x);
    expect(animatedEntity.position.y).toStrictEqual(weapon.position.y + offset);
    expect(animatedEntity.position.angle).toStrictEqual(weapon.position.angle);
  }
}

describe('EntityAnimationController', () => {
  let sut: EntityAnimationController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockTime: MockTime;
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockTime = new MockTime();
    mockGameConfig = new MockGameConfig();

    sut = new EntityAnimationController(mockGameConfig, mockEntityManager, mockTime);
  });

  describe('meleeAnimation', () => {
    it('entity is rotated up, attack should go up', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const animated = getMeleeAnimatedAtHalfProgress(sut, mockEntityManager, mockTime, mockGameConfig, weapon, player);
      const halfW = player.width / 2;
      const halfH = player.height / 2;
      expect(animated.position.x).toStrictEqual(weapon.position.x - halfW);
      expect(animated.position.y).toStrictEqual(weapon.position.y - halfH);
    });

    it('entity is rotated down, attack should go down', () => {
      const { player, weapon } = createPlayerAndWeapon(Math.PI);
      const animated = getMeleeAnimatedAtHalfProgress(sut, mockEntityManager, mockTime, mockGameConfig, weapon, player);
      const halfW = player.width / 2;
      const halfH = player.height / 2;
      expect(animated.position.x).toStrictEqual(weapon.position.x + halfW);
      expect(animated.position.y).toStrictEqual(weapon.position.y + halfH);
    });
  });

  describe('projectileAnimation', () => {
    it('entity is rotated up, attack should go up', () => {
      const { player, weapon } = createPlayerAndWeapon(0, 50);
      mockEntityManager.getEntityById.mockReturnValue(player);
      sut.createProjectileAttackAnimation('');
      assertProjectileKeyframes(sut, mockTime, mockGameConfig, weapon, 'up');
    });

    it('entity is rotated down, attack should go down', () => {
      const { player, weapon } = createPlayerAndWeapon(Math.PI, 60);
      mockEntityManager.getEntityById.mockReturnValue(player);
      sut.createProjectileAttackAnimation('');
      assertProjectileKeyframes(sut, mockTime, mockGameConfig, weapon, 'down');
    });
  });
});
