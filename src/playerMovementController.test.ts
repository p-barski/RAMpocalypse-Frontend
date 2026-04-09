import { describe, it, beforeEach, type Mocked, vi } from 'vitest';
import { PlayerMovementController } from './playerMovementController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

describe('PlayerMovementController', () => {
  let movementController: PlayerMovementController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockCommunicationService: Mocked<CommunicationService>;
  let mockGameStateManager: Mocked<StateManager>;
  let mockInputHandler: Mocked<InputHandler>;
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
      maxMovementSpeed: 500,
      positionUpdateIntervalMs: 20,
      meleeCooldownMs: 100,
      projectileCooldownMs: 200,
      specialCooldownMs: 300,
      specialRange: 100,
    };

    movementController = new PlayerMovementController(
      mockGameConfig,
      mockEntityManager,
      mockGameStateManager,
      mockInputHandler,
      mockCommunicationService,
    );
  });

  describe('updateBenchmark', () => {
    it('benchmark', () => {
      const mockPlayer = { position: { x: 100, y: 200 } } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      mockInputHandler.isDownPressed.mockReturnValue(true);
      mockInputHandler.isUpPressed.mockReturnValue(false);
      mockInputHandler.isRightPressed.mockReturnValue(true);
      mockInputHandler.isLeftPressed.mockReturnValue(false);

      let total = 0;
      const iterations = 3000;
      for (let i = 0; i < iterations; i++) {
        const deltaTime = randomInt(1, 20);
        const now = Date.now();
        mockInputHandler.isDownPressed.mockReturnValue(Boolean(deltaTime % 2));
        mockInputHandler.isUpPressed.mockReturnValue(Boolean((deltaTime + 1) % 2));
        mockInputHandler.isRightPressed.mockReturnValue(Boolean(deltaTime % 2));
        mockInputHandler.isLeftPressed.mockReturnValue(Boolean((deltaTime + 1) % 2));
        const start = performance.now();
        movementController.update(deltaTime, now);
        const end = performance.now();
        total += end - start;
      }

      console.log(`${iterations} took ${total} ms`);
      console.log(`Took ${total / iterations} ms per update`);
    });
  });
});
