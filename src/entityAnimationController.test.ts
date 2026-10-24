import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { EntityAnimationController } from './entityAnimationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Entity } from './interfaces/entity';
import type { LegLifts } from './interfaces/animationController';
import { createMockEntityManager, MockGameConfig, MockTime } from './testHelpers/mocks';
import { createTestLocalPlayerWithWeapon } from './testHelpers/entityTestFactories';
import { HALF_PI } from './mathUtils';

function createPlayerAndWeapon(angle: number, weaponHeight = 16): { player: Entity; weapon: Entity } {
  const player = createTestLocalPlayerWithWeapon();
  const weapon = player.subEntities[0];
  weapon.position.x = 500;
  weapon.position.y = 500;
  weapon.position.angle = angle;
  weapon.height = weaponHeight;
  return { player, weapon };
}

function getMeleeAnimatedAtProgress(
  sut: EntityAnimationController,
  mockEntityManager: Mocked<EntityManager>,
  mockTime: MockTime,
  mockGameConfig: MockGameConfig,
  weapon: Entity,
  player: Entity,
  progressPercent: number,
): Entity {
  mockEntityManager.getEntityById.mockReturnValue(player);
  sut.createMeleeAttackAnimation('');
  mockTime.frameTimestamp = progressPercent * mockGameConfig.sharedAttackCooldownMs;
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
  let MELEE_WINDUP_END: number;
  let MELEE_SWEEP_END: number;
  let MELEE_SWEEP_SEGMENTS: number;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockTime = new MockTime();
    mockGameConfig = new MockGameConfig();

    sut = new EntityAnimationController(mockGameConfig, mockEntityManager, mockTime);
    MELEE_WINDUP_END = (sut as any).MELEE_WINDUP_END;
    MELEE_SWEEP_END = (sut as any).MELEE_SWEEP_END;
    MELEE_SWEEP_SEGMENTS = (sut as any).MELEE_SWEEP_SEGMENTS;
  });

  describe('meleeAnimation', () => {
    // Tip follows half circle of meleeRange radius around the tip at rest, pivot (bottom center) trails it by weapon height
    it('swings to the left of the facing direction during the windup', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const pivotDistance = mockGameConfig.meleeRange - weapon.height;
      const animated = getMeleeAnimatedAtProgress(
        sut,
        mockEntityManager,
        mockTime,
        mockGameConfig,
        weapon,
        player,
        MELEE_WINDUP_END,
      );
      expect(animated.position.x).toBeCloseTo(weapon.position.x - pivotDistance);
      expect(animated.position.y).toBeCloseTo(weapon.position.y - weapon.height);
      expect(animated.position.angle).toBeCloseTo(weapon.position.angle - HALF_PI);
    });

    it('sweeps through the facing direction at the midpoint', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const animated = getMeleeAnimatedAtProgress(
        sut,
        mockEntityManager,
        mockTime,
        mockGameConfig,
        weapon,
        player,
        (MELEE_WINDUP_END + MELEE_SWEEP_END) / 2,
      );
      expect(animated.position.x).toBeCloseTo(weapon.position.x);
      expect(animated.position.y).toBeCloseTo(weapon.position.y - mockGameConfig.meleeRange);
      expect(animated.position.angle).toBeCloseTo(weapon.position.angle);
    });

    it('keeps the weapon tip on the melee range arc mid-sweep', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const animated = getMeleeAnimatedAtProgress(
        sut,
        mockEntityManager,
        mockTime,
        mockGameConfig,
        weapon,
        player,
        MELEE_WINDUP_END + (MELEE_SWEEP_END - MELEE_WINDUP_END) / MELEE_SWEEP_SEGMENTS,
      );
      const angle = animated.position.angle;
      const tipX = animated.position.x + weapon.height * Math.sin(angle) - weapon.position.x;
      const tipY = animated.position.y - weapon.height * Math.cos(angle) - (weapon.position.y - weapon.height);
      expect(angle).toBeCloseTo(-HALF_PI + Math.PI / MELEE_SWEEP_SEGMENTS);
      expect(Math.hypot(tipX, tipY)).toBeCloseTo(mockGameConfig.meleeRange);
    });

    it('finishes the sweep to the right of the facing direction', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const pivotDistance = mockGameConfig.meleeRange - weapon.height;
      const animated = getMeleeAnimatedAtProgress(
        sut,
        mockEntityManager,
        mockTime,
        mockGameConfig,
        weapon,
        player,
        MELEE_SWEEP_END,
      );
      expect(animated.position.x).toBeCloseTo(weapon.position.x + pivotDistance);
      expect(animated.position.y).toBeCloseTo(weapon.position.y - weapon.height);
      expect(animated.position.angle).toBeCloseTo(weapon.position.angle + HALF_PI);
    });

    it('respects the entity facing direction when rotated', () => {
      const { player, weapon } = createPlayerAndWeapon(Math.PI);
      const animated = getMeleeAnimatedAtProgress(
        sut,
        mockEntityManager,
        mockTime,
        mockGameConfig,
        weapon,
        player,
        (MELEE_WINDUP_END + MELEE_SWEEP_END) / 2,
      );
      expect(animated.position.x).toBeCloseTo(weapon.position.x);
      expect(animated.position.y).toBeCloseTo(weapon.position.y + mockGameConfig.meleeRange);
      expect(animated.position.angle).toBeCloseTo(weapon.position.angle);
    });

    it('returns to rest once the animation finishes', () => {
      const { player, weapon } = createPlayerAndWeapon(0);
      const animated = getMeleeAnimatedAtProgress(sut, mockEntityManager, mockTime, mockGameConfig, weapon, player, 1);
      expect(animated.position.x).toStrictEqual(weapon.position.x);
      expect(animated.position.y).toStrictEqual(weapon.position.y);
      expect(animated.position.angle).toStrictEqual(weapon.position.angle);
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

  describe('walkingLegLifts', () => {
    const FRAME_MS = 16;

    function advanceFrame(player: Entity, dx = 0): LegLifts {
      mockTime.deltaTime = FRAME_MS / 1000;
      mockTime.frameTimestamp += FRAME_MS;
      player.position = { ...player.position, x: player.position.x + dx };
      return sut.getWalkingLegLifts(player);
    }

    it('keeps both legs down while standing still', () => {
      const player = createTestLocalPlayerWithWeapon();
      for (let i = 0; i < 30; i++) {
        expect(advanceFrame(player)).toEqual({ left: 0, right: 0 });
      }
    });

    it('lifts the legs alternately while moving', () => {
      const player = createTestLocalPlayerWithWeapon();
      advanceFrame(player);
      let maxLeft = 0;
      let maxRight = 0;
      for (let i = 0; i < 60; i++) {
        const lifts = advanceFrame(player, 1);
        expect(lifts.left === 0 || lifts.right === 0).toBe(true);
        maxLeft = Math.max(maxLeft, lifts.left);
        maxRight = Math.max(maxRight, lifts.right);
      }
      expect(maxLeft).toBeGreaterThan(0);
      expect(maxRight).toBeGreaterThan(0);
      expect(Math.max(maxLeft, maxRight)).toBeLessThanOrEqual(player.height * 0.06);
    });

    it('settles both legs back down shortly after stopping', () => {
      const player = createTestLocalPlayerWithWeapon();
      advanceFrame(player);
      for (let i = 0; i < 30; i++) advanceFrame(player, 1);
      for (let i = 0; i < 30; i++) advanceFrame(player);

      expect(advanceFrame(player)).toEqual({ left: 0, right: 0 });
    });
  });

  describe('armSwitchAnimation', () => {
    // Weapon was in the left arm (x = -500) and has just been moved to the right arm
    function createSwitchedPlayerAndWeapon(angle: number): { player: Entity; weapon: Entity } {
      const { player, weapon } = createPlayerAndWeapon(angle);
      mockEntityManager.getEntityById.mockReturnValue(player);
      sut.createArmSwitchAnimation('');
      return { player, weapon };
    }

    function getAnimatedAt(weapon: Entity, progressPercent: number, parentAngle = 0): Entity {
      mockTime.frameTimestamp = progressPercent * mockGameConfig.armSwitchDurationMs;
      return sut.getAnimatedEntity(weapon, parentAngle);
    }

    it('starts in the previous arm', () => {
      const { weapon } = createSwitchedPlayerAndWeapon(0);
      const animated = getAnimatedAt(weapon, 0);
      expect(animated.position.x).toBeCloseTo(-weapon.position.x);
      expect(animated.position.y).toBeCloseTo(weapon.position.y);
    });

    it('tosses the weapon over the head halfway through, regardless of facing direction', () => {
      const { weapon } = createSwitchedPlayerAndWeapon(0);
      const animated = getAnimatedAt(weapon, 0.5, Math.PI);
      expect(animated.position.x).toBeCloseTo(0);
      expect(animated.position.y).toBeLessThan(weapon.position.y);
      expect(animated.position.angle).toBeCloseTo(Math.PI);
    });

    it('ends in the new arm', () => {
      const { weapon } = createSwitchedPlayerAndWeapon(0);
      const animated = getAnimatedAt(weapon, 1);
      expect(animated.position).toStrictEqual(weapon.position);
    });
  });
});
