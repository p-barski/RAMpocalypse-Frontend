import { PlayerAttackController } from './playerAttackController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { Entity } from './entity';

describe('PlayerAttackController', () => {
  let attackController: PlayerAttackController;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockCommunicationService: jest.Mocked<CommunicationService>;
  let mockGameStateManager: jest.Mocked<StateManager>;
  let mockInputHandler: jest.Mocked<InputHandler>;

  beforeEach(() => {
    mockEntityManager = {
      getLocalPlayer: jest.fn(),
      getEntities: jest.fn(),
      getOtherPlayers: jest.fn(),
      addEntity: jest.fn(),
      removeEntity: jest.fn(),
      getEntityByPlayerId: jest.fn(),
      clearEntities: jest.fn(),
      createLocalPlayer: jest.fn(),
      updateLocalPlayerPosition: jest.fn(),
      updateLocalPlayerSprite: jest.fn(),
      getLocalPlayerSpriteVariant: jest.fn(),
      setLocalPlayerSpriteVariant: jest.fn(),
      createOtherPlayer: jest.fn(),
      updateOrCreateOtherPlayer: jest.fn(),
      removeOtherPlayer: jest.fn(),
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
      isKeyPressed: jest.fn(),
      isUpPressed: jest.fn(),
      isDownPressed: jest.fn(),
      isLeftPressed: jest.fn(),
      isRightPressed: jest.fn(),
      getMouseX: jest.fn(),
      getMouseY: jest.fn(),
      setup: jest.fn(),
      cleanup: jest.fn(),
      setAttackCallback: jest.fn(),
    };

    attackController = new PlayerAttackController(
      mockEntityManager,
      mockCommunicationService,
      mockGameStateManager,
      mockInputHandler,
    );
  });

  describe('performMeleeAttack', () => {
    it('should call communicationService.performMeleeAttack with correct parameters', () => {
      const mockPlayer = { x: 100, y: 200 } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(true);
      mockEntityManager.getLocalPlayer.mockReturnValue(mockPlayer);
      mockInputHandler.getMouseX.mockReturnValue(200);
      mockInputHandler.getMouseY.mockReturnValue(200);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('should not attack when game is not playing', () => {
      const mockPlayer = { x: 100, y: 200 } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(false);
      mockCommunicationService.isConnected.mockReturnValue(true);
      mockEntityManager.getLocalPlayer.mockReturnValue(mockPlayer);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should not attack when not connected', () => {
      const mockPlayer = { x: 100, y: 200 } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(false);
      mockEntityManager.getLocalPlayer.mockReturnValue(mockPlayer);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should not attack when local player is null', () => {
      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(true);
      mockEntityManager.getLocalPlayer.mockReturnValue(null);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should calculate normalized direction towards mouse position', () => {
      const mockPlayer = { x: 0, y: 0 } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(true);
      mockEntityManager.getLocalPlayer.mockReturnValue(mockPlayer);
      mockInputHandler.getMouseX.mockReturnValue(100);
      mockInputHandler.getMouseY.mockReturnValue(0);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('should respect cooldown and not attack during cooldown period', () => {
      const mockPlayer = { x: 100, y: 200 } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(true);
      mockEntityManager.getLocalPlayer.mockReturnValue(mockPlayer);
      mockInputHandler.getMouseX.mockReturnValue(200);
      mockInputHandler.getMouseY.mockReturnValue(200);

      attackController.performMeleeAttack();
      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
    });
  });
});
