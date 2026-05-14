import { describe, it, beforeEach, type Mocked, vi, expect } from 'vitest';
import { PlayerMovementController } from './playerMovementController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';
import type { Time } from './interfaces/time';
import type { Vector2D } from './interfaces/messageInterfaces';

describe('PlayerMovementController', () => {
  let sut: PlayerMovementController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockCommunicationService: Mocked<CommunicationService>;
  let mockGameStateManager: Mocked<StateManager>;
  let mockInputHandler: Mocked<InputHandler>;
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

    mockInputHandler = {
      mouseX: 200,
      mouseY: 100,
      isKeyPressed: vi.fn(),
      isUpPressed: vi.fn(),
      isDownPressed: vi.fn(),
      isLeftPressed: vi.fn(),
      isRightPressed: vi.fn(),
      setup: vi.fn(),
      cleanup: vi.fn(),
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

    mockTime = { deltaTime: 0, averageFrameTime: 0, frameTimestamp: 0 };

    sut = new PlayerMovementController(
      mockGameConfig,
      mockEntityManager,
      mockGameStateManager,
      mockInputHandler,
      mockCommunicationService,
      mockTime,
    );
  });

  const forceDash = (value: boolean, velocityVector: Vector2D, lastDashTime: number) => {
    sut['isDashing'] = value;
    sut['dashVelocity'] = velocityVector;
    sut['lastDashTime'] = lastDashTime;
  };

  describe('update', () => {
    it('uses dash velocity when isDashing is true', () => {
      const mockPlayer = { position: { x: 100, y: 100 }, width: 64, height: 64 } as Entity;
      const velocityVector: Vector2D = { x: 100, y: 0 };
      const elapsedMs = 30;
      const expectedX = mockPlayer.position.x + elapsedMs / 10;

      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      (mockTime as any).frameTimestamp = Date.now();
      (mockTime as any).deltaTime = elapsedMs / 1000;
      forceDash(true, velocityVector, mockTime.frameTimestamp - elapsedMs);
      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: expectedX, y: 100 }),
      );
    });

    it('sets isDashing false when passed dashDurationMs', () => {
      const mockPlayer = { position: { x: 100, y: 100 }, width: 64, height: 64 } as Entity;
      const velocityVector: Vector2D = { x: 100, y: 0 };
      const elapsedMs = 30;
      const dashDurationMs = elapsedMs;
      const expectedX = mockPlayer.position.x + elapsedMs / 10;
      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      (mockTime as any).frameTimestamp = Date.now();
      (mockTime as any).deltaTime = elapsedMs / 1000;
      (mockGameConfig as any).dashDurationMs = dashDurationMs;
      forceDash(true, velocityVector, mockTime.frameTimestamp - elapsedMs);

      sut.update();

      expect(sut['isDashing']).toStrictEqual(false);
      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: expectedX, y: 100 }),
      );
    });

    it('should only apply dash velocity to max dashDurationMs', () => {
      const mockPlayer = { position: { x: 100, y: 100 }, width: 64, height: 64 } as Entity;
      const velocityVector: Vector2D = { x: 100, y: 0 };
      const elapsedMs = 60;
      const dashDurationMs = elapsedMs / 2;
      const expectedX = mockPlayer.position.x + dashDurationMs / 10;
      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      (mockTime as any).frameTimestamp = Date.now();
      (mockTime as any).deltaTime = elapsedMs / 1000;
      (mockGameConfig as any).dashDurationMs = dashDurationMs;
      forceDash(true, velocityVector, mockTime.frameTimestamp - elapsedMs);

      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: expectedX, y: 100 }),
      );
    });
  });

  describe('dash', () => {
    beforeEach(() => {
      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockInputHandler.isRightPressed = vi.fn().mockReturnValue(true);
      mockInputHandler.isLeftPressed = vi.fn().mockReturnValue(false);
      mockInputHandler.isUpPressed = vi.fn().mockReturnValue(false);
      mockInputHandler.isDownPressed = vi.fn().mockReturnValue(false);
      (mockTime as { frameTimestamp: number }).frameTimestamp = 10_000;
    });

    it('keeps isDashing true when communicationService.dash resolves true', async () => {
      mockCommunicationService.dash.mockResolvedValue(true);

      await sut.dash();

      expect(sut['isDashing']).toBe(true);
      expect(mockCommunicationService.dash).toHaveBeenCalledTimes(1);
    });

    it('sets isDashing false when communicationService.dash resolves false (server declined)', async () => {
      mockCommunicationService.dash.mockResolvedValue(false);

      await sut.dash();

      expect(sut['isDashing']).toBe(false);
      expect(mockCommunicationService.dash).toHaveBeenCalledTimes(1);
    });

    it('does not start a dash when the game is not playing', async () => {
      mockGameStateManager.isPlaying.mockReturnValue(false);
      mockCommunicationService.dash.mockResolvedValue(true);

      await sut.dash();

      expect(mockCommunicationService.dash).not.toHaveBeenCalled();
      expect(sut['isDashing']).toBe(false);
    });
  });
});
