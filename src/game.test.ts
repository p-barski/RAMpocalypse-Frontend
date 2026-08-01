import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from './game';
import type { Entity } from './interfaces/entity';
import type { Player } from './interfaces/messageInterfaces';
import {
  createMockCommunicationService,
  createMockEntityManager,
  createMockStateManager,
  createMockMovementController,
  createMockAttackController,
  createMockRenderingService,
  createMockAudioController,
  createMockAnimationController,
  createMockViewportManager,
  createMockInputHandler,
  MockGameConfig,
} from './testHelpers/mocks';
import { GameTime } from './gameTime';

describe('Game', () => {
  let sut: Game;
  let mockEntityManager: ReturnType<typeof createMockEntityManager>;
  let mockGameStateManager: ReturnType<typeof createMockStateManager>;
  let mockCommunicationService: ReturnType<typeof createMockCommunicationService>;
  let mockGameConfig: MockGameConfig;

  function createSut(playerName = ''): Game {
    return new Game(
      mockGameConfig,
      mockCommunicationService,
      mockEntityManager,
      mockGameStateManager,
      createMockInputHandler(),
      createMockViewportManager(),
      createMockMovementController(),
      createMockAttackController(),
      createMockRenderingService(),
      createMockAudioController(),
      createMockAnimationController(),
      new GameTime(),
      { isOnlineMatch: false },
      playerName,
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockEntityManager = createMockEntityManager();
    mockGameStateManager = createMockStateManager();
    mockCommunicationService = createMockCommunicationService();
    mockCommunicationService.connect.mockResolvedValue('local');
    mockGameConfig = new MockGameConfig();
    mockGameConfig.spawnProtectionMs = 1000;

    mockEntityManager.getLocalPlayerEntity.mockReturnValue({ id: 'local' } as Entity);

    sut = createSut();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('onPlayerJoinedLobby', () => {
    const remotePlayer: Player = {
      id: 'remote',
      position: { x: 1, y: 2, angle: 0 },
      spriteData: { url: '/sprite.png', width: 10, height: 10, scaleFactor: 1 },
      subEntities: [],
      health: 100,
      maxHealth: 100,
      isAlive: true,
    };

    it('tracks the joining player immediately but does not create their entity yet', async () => {
      const promise = sut.onPlayerJoinedLobby(remotePlayer);

      expect(mockGameStateManager.addPlayer).toHaveBeenCalledWith(remotePlayer);
      expect(mockEntityManager.createRemotePlayer).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(mockGameConfig.spawnProtectionMs);
      await promise;
    });

    it('creates the remote entity only once spawn protection has elapsed', async () => {
      mockGameStateManager.getPlayer.mockReturnValue(remotePlayer);
      const promise = sut.onPlayerJoinedLobby(remotePlayer);

      await vi.advanceTimersByTimeAsync(mockGameConfig.spawnProtectionMs - 1);
      expect(mockEntityManager.createRemotePlayer).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await promise;

      expect(mockEntityManager.createRemotePlayer).toHaveBeenCalledWith(
        remotePlayer.id,
        remotePlayer.position,
        remotePlayer.spriteData,
        remotePlayer.subEntities,
      );
    });

    it('does not reveal a player who already left during the protection window', async () => {
      mockGameStateManager.getPlayer.mockReturnValue(undefined); // left/removed before the delay elapsed
      const promise = sut.onPlayerJoinedLobby(remotePlayer);

      await vi.advanceTimersByTimeAsync(mockGameConfig.spawnProtectionMs);
      await promise;

      expect(mockEntityManager.createRemotePlayer).not.toHaveBeenCalled();
    });

    it('does nothing for the local player themselves', async () => {
      await sut.onPlayerJoinedLobby({ ...remotePlayer, id: 'local' });

      expect(mockGameStateManager.addPlayer).not.toHaveBeenCalled();
      expect(mockEntityManager.createRemotePlayer).not.toHaveBeenCalled();
    });
  });

  describe('onOtherPlayerPositionUpdated', () => {
    it('ignores updates for players whose entity has not been revealed yet', async () => {
      mockEntityManager.getEntityById.mockReturnValue(undefined);

      await sut.onOtherPlayerPositionUpdated('remote', { x: 5, y: 5, angle: 0 });

      expect(mockEntityManager.updateEntityPosition).not.toHaveBeenCalled();
    });

    it('applies updates once the entity exists', async () => {
      mockEntityManager.getEntityById.mockReturnValue({ id: 'remote' } as Entity);
      const position = { x: 5, y: 5, angle: 0 };

      await sut.onOtherPlayerPositionUpdated('remote', position);

      expect(mockEntityManager.updateEntityPosition).toHaveBeenCalledWith('remote', position);
    });
  });

  describe('connect', () => {
    it('does not send a name to the server when none is configured', async () => {
      await sut.connect();

      expect(mockCommunicationService.setPlayerName).not.toHaveBeenCalled();
    });

    it('sends the configured player name to the server after connecting', async () => {
      sut = createSut('Alice');

      await sut.connect();

      expect(mockCommunicationService.setPlayerName).toHaveBeenCalledWith('Alice');
    });
  });

  describe('setPlayerName', () => {
    it('pushes the new name to the server immediately while connected', async () => {
      mockCommunicationService.isConnected.mockReturnValue(true);

      await sut.setPlayerName('Bob');

      expect(mockCommunicationService.setPlayerName).toHaveBeenCalledWith('Bob');
    });

    it('uses the updated name on the next connect (e.g. after a reconnect)', async () => {
      mockCommunicationService.isConnected.mockReturnValue(false);
      await sut.setPlayerName('Bob');
      mockCommunicationService.setPlayerName.mockClear();

      await sut.connect();

      expect(mockCommunicationService.setPlayerName).toHaveBeenCalledWith('Bob');
    });
  });
});
