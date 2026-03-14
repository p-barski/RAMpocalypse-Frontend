import { PlayerAttackController } from './playerAttackController';
import { StateManager } from './interfaces/stateManager';
import { CommunicationService } from './communicatonService';
import { Entity } from './entity';
import { Time } from './interfaces/time';

describe('PlayerAttackController', () => {
  let attackController: PlayerAttackController;
  let mockCommunicationService: jest.Mocked<CommunicationService>;
  let mockGameStateManager: jest.Mocked<StateManager>;
  let mockTime: Time;

  beforeEach(() => {
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

    mockTime = {
      averageFrameTime: 0,
      frameTimestamp: 0,
      deltaTime: 0,
    };

    attackController = new PlayerAttackController(mockCommunicationService, mockGameStateManager, mockTime);
  });

  describe('performMeleeAttack', () => {
    it('should not attack when game is not playing', () => {
      const mockPlayer = { position: { x: 100, y: 200 } } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(false);
      mockCommunicationService.isConnected.mockReturnValue(true);

      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should respect cooldown and not attack during cooldown period', () => {
      const mockPlayer = { position: { x: 100, y: 200 } } as Entity;

      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockCommunicationService.isConnected.mockReturnValue(true);

      attackController.performMeleeAttack();
      attackController.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
    });
  });
});
