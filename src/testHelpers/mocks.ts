import { vi, type Mock, type Mocked } from 'vitest';
import type { GameConfig } from '../interfaces/gameConfig';
import type { EntityManager } from '../interfaces/entityManager';
import type { CommunicationService } from '../interfaces/communicatonService';
import type { StateManager } from '../interfaces/stateManager';
import type { Time } from '../interfaces/time';
import type { InputHandler } from '../interfaces/inputHandler';

export class MockGameConfig implements GameConfig {
  gameWidth = 1920;
  gameHeight = 1080;
  movementSpeed = 500;
  rotationSpeedRadPerSec = 2.0;
  positionUpdateIntervalMs = 20;
  dashSpeedMultiplier = 4;
  dashCooldownMs = 2000;
  dashDurationMs = 250;
  meleeCooldownMs = 100;
  sharedAttackCooldownMs = 50;
  projectileCooldownMs = 200;
  specialCooldownMs = 300;
  specialRange = 100;
  meleeRange = 300;
  projectileSpeed = 800;
  specialSpeed = 400;
  meleeLifetime = 200;
  projectileLifetime = 3000;
  specialLifetime = 1000;
  meleeDamage = 10;
  projectileDamage = 15;
  specialDamage = 20;
}

export class MockTime implements Time {
  frameTimestamp = 0;
  deltaTime = 0;
  averageFrameTime = 0;
}

export type MockGameApi = {
  connect: Mock<() => Promise<void>>;
  enterLocalSandbox: Mock<() => void>;
  start: Mock<() => void>;
  stop: Mock<() => void>;
  onMessageReceived: (message: unknown) => void;
  onClose?: Mock<(error: Error | undefined) => Promise<void>>;
};

export function createMockGameApi(overrides?: Partial<MockGameApi>): MockGameApi {
  return {
    connect: vi.fn(async () => {}),
    enterLocalSandbox: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onMessageReceived: () => {},
    ...overrides,
  };
}

export function createMockEntityManager(): Mocked<EntityManager> {
  return {
    getEntities: vi.fn(),
    getEntityById: vi.fn(),
    getLocalPlayerEntity: vi.fn(),
    clearRemoteEntities: vi.fn(),
    updateLocalPlayerId: vi.fn(),
    updateLocalPlayerPosition: vi.fn(),
    updateLocalPlayerSubEntities: vi.fn(),
    updateLocalPlayerSprite: vi.fn(),
    updateEntityPosition: vi.fn(),
    createRemotePlayer: vi.fn(),
    removeRemotePlayer: vi.fn(),
    hidePlayer: vi.fn(),
    showPlayer: vi.fn(),
  };
}

export function createMockCommunicationService(): Mocked<CommunicationService> {
  return {
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
}

export function createMockStateManager(): Mocked<StateManager> {
  return {
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
    isMatchmaking: vi.fn(),
    isLobbyReady: vi.fn(),
    hasEnded: vi.fn(),
    isWaiting: vi.fn(),
  };
}

export function createMockInputHandler(overrides?: Partial<Mocked<InputHandler>>): Mocked<InputHandler> {
  return {
    isKeyPressed: vi.fn(),
    isUpPressed: vi.fn(),
    isDownPressed: vi.fn(),
    isLeftPressed: vi.fn(),
    isRightPressed: vi.fn(),
    isRotateLeftPressed: vi.fn(),
    isRotateRightPressed: vi.fn(),
    setup: vi.fn(),
    cleanup: vi.fn(),
    ...overrides,
  };
}
