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
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEntityManager = createMockEntityManager();
    mockGameStateManager = createMockStateManager();
    mockGameConfig = new MockGameConfig();
    mockGameConfig.spawnProtectionMs = 1000;

    mockEntityManager.getLocalPlayerEntity.mockReturnValue({ id: 'local' } as Entity);

    sut = new Game(
      mockGameConfig,
      createMockCommunicationService(),
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
    );
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
});
