import { PlayerMovementController } from './playerMovementController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { Position } from './messageInterfaces';
import { Entity } from './entity';
import { randomInt } from 'crypto';

describe('PlayerMovementController', () => {
  let movementController: PlayerMovementController;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockCommunicationService: jest.Mocked<CommunicationService>;
  let mockGameStateManager: jest.Mocked<StateManager>;
  let mockInputHandler: jest.Mocked<InputHandler>;
  beforeEach(() => {
    mockEntityManager = {
      getLocalPlayerEntity: jest.fn(),
      getEntities: jest.fn(),
      getEntityById: jest.fn(),
      clearRemoteEntities: jest.fn(),
      updateLocalPlayerId: jest.fn(),
      updateLocalPlayerPosition: jest.fn(),
      updateLocalPlayerSprite: jest.fn(),
      updateLocalPlayerSubEntities: jest.fn(),
      createRemotePlayer: jest.fn(),
      updateEntityPosition: jest.fn(),
      removeRemotePlayer: jest.fn(),
      hidePlayer: jest.fn(),
      showPlayer: jest.fn(),
    };

    mockCommunicationService = {
      connect: jest.fn(),
      isConnected: jest.fn(),
      disconnect: jest.fn(),
      requestMatchmaking: jest.fn(),
      updatePlayerPosition: jest.fn(),
      performMeleeAttack: jest.fn(),
      performProjectileAttack: jest.fn(),
      performSpecialAttack: jest.fn(),
      reportProjectileHit: jest.fn(),
      leaveGame: jest.fn(),
    };

    mockGameStateManager = {
      getGameState: jest.fn(),
      setGameState: jest.fn(),
      getWinnerId: jest.fn(),
      setWinnerId: jest.fn(),
      getPlayer: jest.fn(),
      addPlayer: jest.fn(),
      updatePlayerHealth: jest.fn(),
      getAllPlayers: jest.fn(),
      removePlayer: jest.fn(),
      reset: jest.fn(),
      isPlaying: jest.fn(),
      hasEnded: jest.fn(),
      isWaiting: jest.fn(),
    };

    mockInputHandler = {
      mouseX: 200,
      mouseY: 100,
      isKeyPressed: jest.fn(),
      isUpPressed: jest.fn(),
      isDownPressed: jest.fn(),
      isLeftPressed: jest.fn(),
      isRightPressed: jest.fn(),
      setup: jest.fn(),
      cleanup: jest.fn(),
    };

    movementController = new PlayerMovementController(
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
      // mockInputHandler.getMouseX.mockReturnValue(200);
      // mockInputHandler.getMouseY.mockReturnValue(200);
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
