import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { PlayerAttackController } from './playerAttackController';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { CommunicationService } from './interfaces/communicatonService';
import {
  createMockCommunicationService,
  createMockEntityManager,
  createMockStateManager,
  MockGameConfig,
  MockTime,
} from './testHelpers/mocks';

describe('PlayerAttackController', () => {
  let sut: PlayerAttackController;
  let mockEntityManager: Mocked<EntityManager>;
  let mockCommunicationService: Mocked<CommunicationService>;
  let mockGameStateManager: Mocked<StateManager>;
  let mockTime: MockTime;
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockCommunicationService = createMockCommunicationService();
    mockGameStateManager = createMockStateManager();
    mockTime = new MockTime();
    mockGameConfig = new MockGameConfig();

    sut = new PlayerAttackController(
      mockGameConfig,
      mockEntityManager,
      mockCommunicationService,
      mockGameStateManager,
      mockTime,
    );
  });

  describe('performMeleeAttack', () => {
    it('should not attack when game is not playing', () => {
      mockGameStateManager.isPlaying.mockReturnValue(false);

      sut.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
    });

    it('should respect cooldown and not attack during cooldown period', () => {
      mockGameStateManager.isPlaying.mockReturnValue(true);

      sut.performMeleeAttack();
      sut.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
    });
  });

  describe('shared attack cooldown', () => {
    it('should block a different attack type while shared cooldown is active', () => {
      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockGameConfig.meleeCooldownMs = 0;
      mockGameConfig.projectileCooldownMs = 0;
      mockGameConfig.sharedAttackCooldownMs = 50;

      sut.performMeleeAttack();
      mockTime.frameTimestamp = 25;
      sut.performProjectileAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
      expect(mockCommunicationService.performProjectileAttack).not.toHaveBeenCalled();
    });
  });

  describe('switchArm', () => {
    beforeEach(() => {
      mockGameStateManager.isPlaying.mockReturnValue(true);
      mockGameConfig.armSwitchDurationMs = 100;
    });

    it('should not switch when game is not playing', () => {
      mockGameStateManager.isPlaying.mockReturnValue(false);

      sut.switchArm();

      expect(mockCommunicationService.switchArm).not.toHaveBeenCalled();
    });

    it('should block attacks for the duration of the switch', () => {
      sut.switchArm();
      mockTime.frameTimestamp = 99;
      sut.performMeleeAttack();
      sut.performProjectileAttack();
      sut.performSpecialAttack();

      expect(mockCommunicationService.switchArm).toHaveBeenCalledTimes(1);
      expect(mockCommunicationService.performMeleeAttack).not.toHaveBeenCalled();
      expect(mockCommunicationService.performProjectileAttack).not.toHaveBeenCalled();
      expect(mockCommunicationService.performSpecialAttack).not.toHaveBeenCalled();
      expect(sut.getCooldownRemaining(AttackTypeValue.Melee)).toBe(1);
    });

    it('should allow attacks once the switch finishes', () => {
      sut.switchArm();
      mockTime.frameTimestamp = 100;
      sut.performMeleeAttack();

      expect(mockCommunicationService.performMeleeAttack).toHaveBeenCalledTimes(1);
      expect(sut.getArmSwitchCdRemaining()).toBe(0);
    });

    it('should not switch again while switching', () => {
      sut.switchArm();
      mockTime.frameTimestamp = 50;
      sut.switchArm();

      expect(mockCommunicationService.switchArm).toHaveBeenCalledTimes(1);
    });

    it('should not switch in the middle of an attack', () => {
      mockGameConfig.sharedAttackCooldownMs = 50;
      sut.performMeleeAttack();
      mockTime.frameTimestamp = 25;
      sut.switchArm();

      expect(mockCommunicationService.switchArm).not.toHaveBeenCalled();

      mockTime.frameTimestamp = 50;
      sut.switchArm();
      expect(mockCommunicationService.switchArm).toHaveBeenCalledTimes(1);
    });
  });
});
