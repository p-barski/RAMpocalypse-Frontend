import { describe, it, beforeEach, type Mocked, vi, expect } from 'vitest';
import { PlayerMovementController } from './playerMovementController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Entity } from './interfaces/entity';
import type { Vector2D } from './interfaces/messageInterfaces';
import {
  createMockCommunicationService,
  createMockEntityManager,
  createMockInputHandler,
  createMockStateManager,
  MockGameConfig,
  MockTime,
} from './testHelpers/mocks';

describe('PlayerMovementController', () => {
  let sut: PlayerMovementController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockCommunicationService: Mocked<CommunicationService>;
  let mockGameStateManager: Mocked<StateManager>;
  let mockInputHandler: Mocked<InputHandler>;
  let mockTime: MockTime;
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockCommunicationService = createMockCommunicationService();
    mockGameStateManager = createMockStateManager();
    mockInputHandler = createMockInputHandler();
    mockGameConfig = new MockGameConfig();
    mockTime = new MockTime();

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
      mockTime.frameTimestamp = Date.now();
      mockTime.deltaTime = elapsedMs / 1000;
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
      mockTime.frameTimestamp = Date.now();
      mockTime.deltaTime = elapsedMs / 1000;
      mockGameConfig.dashDurationMs = dashDurationMs;
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
      mockTime.frameTimestamp = Date.now();
      mockTime.deltaTime = elapsedMs / 1000;
      mockGameConfig.dashDurationMs = dashDurationMs;
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
      mockTime.frameTimestamp = 5000;
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
