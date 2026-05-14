import { describe, it, expect, beforeEach, type Mocked, vi } from 'vitest';
import { PlayerAttackController } from './playerAttackController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { CommunicationService } from './interfaces/communicatonService';
import type { GameConfig } from './interfaces/gameConfig';
import type { Time } from './interfaces/time';

describe('PlayerAttackController', () => {
  let attackController: PlayerAttackController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockCommunicationService: Mocked<CommunicationService>;
  let mockGameStateManager: Mocked<StateManager>;
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

    mockCommunicationService = {
      connect: vi.fn(),
      isConnected: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      requestMatchmaking: vi.fn(),
      updatePlayerPosition: vi.fn(),
      dash: vi.fn(),
      performMeleeAttack: vi.fn(),
      performProjectileAttack: vi.fn(),
      performSpecialAttack: vi.fn(),
      projectileHitPlayer: vi.fn(),
      specialExplosion: vi.fn(),
      leaveGame: vi.fn(),
    };

    mockGameStateManager = {
      getGameState: vi.fn(),
      setGameState: vi.fn(),
      getWinnerId: vi.fn(),
      setWinnerId: vi.fn(),
      getPlayer: vi.fn(),
      addPlayer: vi.fn(),
      updatePlayerHealth: vi.fn(),
      getAllPlayers: vi.fn(),
      removePlayer: vi.fn(),
      reset: vi.fn(),
      isPlaying: vi.fn(),
      hasEnded: vi.fn(),
      isWaiting: vi.fn(),
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
      sharedAttackCooldownMs: 50,
      projectileCooldownMs: 200,
      specialCooldownMs: 300,
      specialRange: 100,
      meleeRange: 300,
      projectileSpeed: 800,
      specialSpeed: 400,
      meleeLifetime: 200,
      projectileLifetime: 3000,
      specialLifetime: 1000,
      meleeDamage: 10,
      projectileDamage: 15,
      specialDamage: 20,
    };

    attackController = new PlayerAttackController(
      mockGameConfig,
      mockEntityManager,
      mockCommunicationService,
      mockGameStateManager,
      mockTime,
    );
  });

  describe('performMeleeAttack', () => {
    it('should not attack when game is not playing', () => {
      mockGameStateManager.isPlaying.mockReturnValue(false);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should respect cooldown and not attack during cooldown period', () => {
      mockGameStateManager.isPlaying.mockReturnValue(true);

      attackController.performMeleeAttack();
      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
    });
  });

  describe('shared attack cooldown', () => {
    it('should block a different attack type while shared cooldown is active', () => {
      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockGameConfig = {
        ...mockGameConfig,
        meleeCooldownMs: 0,
        projectileCooldownMs: 0,
        sharedAttackCooldownMs: 50,
      };
      attackController = new PlayerAttackController(
        mockGameConfig,
        mockEntityManager,
        mockCommunicationService,
        mockGameStateManager,
        mockTime,
      );

      attackController.performMeleeAttack();
      (mockTime as any).frameTimestamp = 25;
      attackController.performProjectileAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
      expect(mockCommunicationService.performProjectileAttack).not.toHaveBeenCalled();
    });
  });
});
