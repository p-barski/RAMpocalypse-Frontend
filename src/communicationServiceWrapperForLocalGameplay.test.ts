import { describe, it, expect, beforeEach, vi, type Mocked, afterEach } from 'vitest';
import {
  CommunicationServiceWrapperForLocalGameplay,
  type GameSession,
  type LocalAttackBridge,
} from './communicationServiceWrapperForLocalGameplay';
import type { CommunicationService } from './interfaces/communicatonService';
import type { EntityManager } from './interfaces/entityManager';
import type { AttackEntity, Position, Vector2D } from './interfaces/messageInterfaces';
import { ChatMessageTypeValue } from './interfaces/messageInterfaces';
import * as localAttackFactory from './localAttackFactory';
import { createTestLocalPlayerWithWeapon } from './testHelpers/entityTestFactories';
import { createMockCommunicationService, MockGameConfig } from './testHelpers/mocks';

describe('CommunicationServiceWrapperForLocalGameplay', () => {
  let sut: CommunicationServiceWrapperForLocalGameplay;
  let signalR: Mocked<CommunicationService>;
  let session: GameSession;
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    mockGameConfig = new MockGameConfig();
    signalR = createMockCommunicationService();
    signalR.connect.mockResolvedValue('player_1');
    session = { isOnlineMatch: false };
    sut = new CommunicationServiceWrapperForLocalGameplay(signalR, session);
  });

  describe('dash', () => {
    it('resolves true without calling SignalR when not using server for gameplay (local gameplay)', async () => {
      signalR.isConnected.mockReturnValue(false);
      session.isOnlineMatch = false;

      const velocity: Vector2D = { x: 1, y: 0 };
      const dashResult = await sut.dash(velocity);

      expect(dashResult).toBe(true);
      expect(signalR.dash).not.toHaveBeenCalled();
    });

    it('delegates to SignalR when connected and in an online match', async () => {
      signalR.isConnected.mockReturnValue(true);
      session.isOnlineMatch = true;
      signalR.dash.mockResolvedValue(false);

      const velocity: Vector2D = { x: 2, y: 3 };
      const dashResult = await sut.dash(velocity);

      expect(signalR.dash).toHaveBeenCalledWith(velocity);
      expect(dashResult).toBe(false);
    });
  });

  describe('updatePlayerPosition', () => {
    it('no-ops when offline so movement stays purely local', async () => {
      signalR.isConnected.mockReturnValue(false);
      session.isOnlineMatch = false;
      const position: Position = { x: 10, y: 20, angle: 0.5 };

      await sut.updatePlayerPosition(position);

      expect(signalR.updatePlayerPosition).not.toHaveBeenCalled();
    });

    it('forwards to SignalR when online and connected', async () => {
      signalR.isConnected.mockReturnValue(true);
      session.isOnlineMatch = true;
      const position: Position = { x: 1, y: 2, angle: 3 };

      await sut.updatePlayerPosition(position);

      expect(signalR.updatePlayerPosition).toHaveBeenCalledWith(position);
    });
  });

  describe('local gameplay attack spawns (localAttackFactory + bridge)', () => {
    const creationTime = 4000;
    const player = createTestLocalPlayerWithWeapon();
    let mockEntityManager: Mocked<Pick<EntityManager, 'getLocalPlayerEntity'>>;
    let applyAttackSpy: ReturnType<typeof vi.fn>;
    let bridge: LocalAttackBridge;

    beforeEach(() => {
      signalR.isConnected.mockReturnValue(false);
      session.isOnlineMatch = false;
      mockEntityManager = { getLocalPlayerEntity: vi.fn() };
      mockEntityManager.getLocalPlayerEntity.mockReturnValue(player);
      applyAttackSpy = vi.fn();
      bridge = {
        gameConfig: mockGameConfig,
        entityManager: mockEntityManager as unknown as EntityManager,
        getCreationTime: () => creationTime,
        applyAttackEffects: applyAttackSpy as LocalAttackBridge['applyAttackEffects'],
      };
      sut.attachLocalAttackBridge(bridge);
      vi.spyOn(localAttackFactory, 'createMeleeAttack');
      vi.spyOn(localAttackFactory, 'createProjectileAttack');
      vi.spyOn(localAttackFactory, 'createSpecialAttack');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('performMeleeAttack invokes applyAttackEffects with a melee entity from localAttackFactory', async () => {
      await sut.performMeleeAttack();

      expect(signalR.performMeleeAttack).not.toHaveBeenCalled();
      expect(localAttackFactory.createMeleeAttack).toHaveBeenCalledTimes(1);
      expect(localAttackFactory.createMeleeAttack).toHaveBeenCalledWith(player, mockGameConfig, creationTime);
      const meleeAttacks = vi.mocked(localAttackFactory.createMeleeAttack).mock.results[0]?.value as AttackEntity[];
      expect(applyAttackSpy).toHaveBeenCalledTimes(1);
      expect(applyAttackSpy).toHaveBeenCalledWith(meleeAttacks);
    });

    it('performProjectileAttack invokes applyAttackEffects with projectile entity from localAttackFactory', async () => {
      await sut.performProjectileAttack();

      expect(localAttackFactory.createProjectileAttack).toHaveBeenCalledTimes(1);
      expect(localAttackFactory.createProjectileAttack).toHaveBeenCalledWith(player, mockGameConfig, creationTime);
      const projectileAttacks = vi.mocked(localAttackFactory.createProjectileAttack).mock.results[0]
        ?.value as AttackEntity[];
      expect(applyAttackSpy).toHaveBeenCalledTimes(1);
      expect(applyAttackSpy).toHaveBeenCalledWith(projectileAttacks);
    });

    it('does not throw when no bridge is attached (effects are skipped)', async () => {
      sut.attachLocalAttackBridge(null);

      await expect(sut.performSpecialAttack()).resolves.toBeUndefined();
      expect(signalR.performSpecialAttack).not.toHaveBeenCalled();
    });
  });

  describe('server gameplay attack hub methods', () => {
    beforeEach(() => {
      signalR.isConnected.mockReturnValue(true);
      session.isOnlineMatch = true;
    });

    it('delegates performMeleeAttack, performProjectileAttack, and performSpecialAttack to SignalR', async () => {
      await sut.performMeleeAttack();
      await sut.performProjectileAttack();
      await sut.performSpecialAttack();

      expect(signalR.performMeleeAttack).toHaveBeenCalledTimes(1);
      expect(signalR.performProjectileAttack).toHaveBeenCalledTimes(1);
      expect(signalR.performSpecialAttack).toHaveBeenCalledTimes(1);
    });
  });

  describe('server hit / explosion callbacks (projectileHitPlayer, specialExplosion)', () => {
    it('does not call SignalR when offline', async () => {
      signalR.isConnected.mockReturnValue(false);
      session.isOnlineMatch = false;

      await sut.projectileHitPlayer('proj1', 'victim');
      await sut.specialExplosion('spec1');

      expect(signalR.projectileHitPlayer).not.toHaveBeenCalled();
      expect(signalR.specialExplosion).not.toHaveBeenCalled();
    });

    it('forwards projectileHitPlayer and specialExplosion to SignalR when online and connected', async () => {
      signalR.isConnected.mockReturnValue(true);
      session.isOnlineMatch = true;

      await sut.projectileHitPlayer('proj1', 'victim');
      await sut.specialExplosion('spec1');

      expect(signalR.projectileHitPlayer).toHaveBeenCalledWith('proj1', 'victim');
      expect(signalR.specialExplosion).toHaveBeenCalledWith('spec1');
    });
  });

  describe('non-gameplay methods', () => {
    it('always delegates connect to SignalR', async () => {
      await sut.connect();
      expect(signalR.connect).toHaveBeenCalledTimes(1);
    });

    it('always delegates chat sendMessage to SignalR', async () => {
      await sut.sendMessage('hi', ChatMessageTypeValue.Lobby);
      expect(signalR.sendMessage).toHaveBeenCalledWith('hi', ChatMessageTypeValue.Lobby);
    });
  });
});
