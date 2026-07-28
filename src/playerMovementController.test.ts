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

    it('increases angle when rotate-right is held', () => {
      const initialAngle = 1.0;
      const deltaTime = 0.016;
      const mockPlayer = { position: { x: 100, y: 100, angle: initialAngle }, width: 64, height: 64 } as Entity;
      const expectedAngle = initialAngle + mockGameConfig.rotationSpeedRadPerSec * deltaTime;

      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      mockTime.deltaTime = deltaTime;
      mockInputHandler.isRotateRightPressed.mockReturnValue(true);
      mockInputHandler.isRotateLeftPressed.mockReturnValue(false);

      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ angle: expectedAngle }),
      );
    });

    it('decreases angle when rotate-left is held', () => {
      const initialAngle = 1.0;
      const deltaTime = 0.016;
      const mockPlayer = { position: { x: 100, y: 100, angle: initialAngle }, width: 64, height: 64 } as Entity;
      const expectedAngle = initialAngle - mockGameConfig.rotationSpeedRadPerSec * deltaTime;

      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      mockTime.deltaTime = deltaTime;
      mockInputHandler.isRotateLeftPressed.mockReturnValue(true);
      mockInputHandler.isRotateRightPressed.mockReturnValue(false);

      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ angle: expectedAngle }),
      );
    });

    it('does nothing when the local player is dead', () => {
      const mockPlayer = { position: { x: 100, y: 100, angle: 0 }, width: 64, height: 64 } as Entity;
      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      mockGameStateManager.getPlayer.mockReturnValue({
        id: 'local',
        position: { x: 100, y: 100, angle: 0 },
        spriteData: {} as never,
        subEntities: [],
        health: 0,
        maxHealth: 100,
        isAlive: false,
      });
      mockInputHandler.isRightPressed = vi.fn().mockReturnValue(true);

      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).not.toHaveBeenCalled();
      expect(mockCommunicationService.updatePlayerPosition).not.toHaveBeenCalled();
    });

    it('keeps angle unchanged when neither rotate key is pressed', () => {
      const initialAngle = 1.0;
      const mockPlayer = { position: { x: 100, y: 100, angle: initialAngle }, width: 64, height: 64 } as Entity;

      mockEntityManager.getLocalPlayerEntity.mockReturnValue(mockPlayer);
      mockTime.deltaTime = 0.016;
      mockInputHandler.isRotateLeftPressed.mockReturnValue(false);
      mockInputHandler.isRotateRightPressed.mockReturnValue(false);

      sut.update();

      expect(mockEntityManager.updateLocalPlayerPosition).toHaveBeenCalledWith(
        expect.objectContaining({ angle: initialAngle }),
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

    it('reports remaining dash cooldown after dashing', async () => {
      mockCommunicationService.dash.mockResolvedValue(true);
      mockGameConfig.dashCooldownMs = 2000;

      await sut.dash();

      mockTime.frameTimestamp = 5500;
      expect(sut.getDashCooldownRemaining()).toBe(1500);
    });

    it('reports zero dash cooldown when ready', () => {
      expect(sut.getDashCooldownRemaining()).toBe(0);
    });
  });
});
