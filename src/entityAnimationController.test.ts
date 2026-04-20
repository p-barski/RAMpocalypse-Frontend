import { describe, it, expect, beforeEach, type Mocked, vi } from 'vitest';
import { EntityAnimationController } from './entityAnimationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Time } from './interfaces/time';
import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';

describe('PlayerMovementController', () => {
  let animationController: EntityAnimationController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockTime: Time;
  let mockGameConfig: GameConfig;

  beforeEach(() => {
    mockEntityManager = {
      getLocalPlayerEntity: vi.fn(),
      getEntities: vi.fn(),
      getEntityById: vi.fn(),
      clearRemoteEntities: vi.fn(),
      updateLocalPlayerId: vi.fn(),
      updateLocalPlayerPosition: vi.fn(),
      updateLocalPlayerSprite: vi.fn(),
      updateLocalPlayerSubEntities: vi.fn(),
      createRemotePlayer: vi.fn(),
      updateEntityPosition: vi.fn(),
      removeRemotePlayer: vi.fn(),
      hidePlayer: vi.fn(),
      showPlayer: vi.fn(),
    };

    mockTime = {
      averageFrameTime: 0,
      frameTimestamp: 0,
      deltaTime: 0,
    };

    mockGameConfig = {
      gameWidth: 1920,
      gameHeight: 1080,
      movementSpeed: 500,
      positionUpdateIntervalMs: 20,
      dashSpeedMultiplier: 4,
      dashCooldownMs: 2000,
      dashDurationMs: 250,
      meleeCooldownMs: 100,
      projectileCooldownMs: 200,
      specialCooldownMs: 300,
      specialRange: 100,
    };

    animationController = new EntityAnimationController(mockGameConfig, mockEntityManager, mockTime);
  });

  describe('meleeAnimation', () => {
    it('entity is rotated up, attack should go up', () => {
      const mockWeapon = {
        id: 'weapon_mock',
        position: { x: 100, y: 200, angle: 0 },
      } as Entity;
      const mockEntity = { width: 100, height: 50, subEntities: [mockWeapon] } as Entity;

      mockEntityManager.getEntityById.mockImplementation((_id: string) => mockEntity);
      animationController.createMeleeAttackAnimation('');
      (mockTime as any).frameTimestamp = 0.5 * mockGameConfig.meleeCooldownMs;
      const animatedEnttiy = animationController.getAnimatedEntity(mockWeapon);
      expect(animatedEnttiy.position.x).toStrictEqual(mockWeapon.position.x - mockEntity.width / 2);
      expect(animatedEnttiy.position.y).toStrictEqual(mockWeapon.position.y - mockEntity.height / 2);
      expect(animatedEnttiy.position.angle).toStrictEqual(mockWeapon.position.angle + Math.PI);
    });

    it('entity is rotated down, attack should go down', () => {
      const mockWeapon = {
        id: 'weapon_mock',
        position: { x: 100, y: 200, angle: Math.PI },
      } as Entity;
      const mockEntity = { width: 100, height: 50, subEntities: [mockWeapon] } as Entity;

      mockEntityManager.getEntityById.mockImplementation((_id: string) => mockEntity);
      animationController.createMeleeAttackAnimation('');
      (mockTime as any).frameTimestamp = 0.5 * mockGameConfig.meleeCooldownMs;
      const animatedEnttiy = animationController.getAnimatedEntity(mockWeapon);
      expect(animatedEnttiy.position.x).toStrictEqual(mockWeapon.position.x + mockEntity.width / 2);
      expect(animatedEnttiy.position.y).toStrictEqual(mockWeapon.position.y + mockEntity.height / 2);
      expect(animatedEnttiy.position.angle).toStrictEqual(mockWeapon.position.angle + Math.PI);
    });
  });
});
