import { describe, it, expect, beforeEach } from 'vitest';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import { createTestLocalPlayerWithWeapon } from './testHelpers/entityTestFactories';
import { MockGameConfig } from './testHelpers/mocks';
import {
  createMeleeAttack,
  createProjectileAttack,
  createSpecialAttack,
  getAttackPosition,
} from './localAttackFactory';
import { HALF_PI } from './mathUtils';

describe('localAttackFactory', () => {
  let mockGameConfig: MockGameConfig;

  beforeEach(() => {
    mockGameConfig = new MockGameConfig();
  });

  describe('getAttackPosition', () => {
    it('offsets spawn using first sub-entity (weapon)', () => {
      const player = createTestLocalPlayerWithWeapon({ x: 100, y: 200, angle: 0 });
      // half of weapond height = 8 -> y = 200 - 8 = 192
      const position = getAttackPosition(player);
      expect(position.x).toBeCloseTo(110);
      expect(position.y).toBeCloseTo(192);
    });

    it('falls back to player position when there is no weapon sub-entity', () => {
      const player = createTestLocalPlayerWithWeapon({ x: 50, y: 60, angle: 1.2 });
      player.subEntities = [];
      const position = getAttackPosition(player);
      expect(position.x).toBe(50);
      expect(position.y).toBe(60);
    });
  });

  describe('createProjectileAttack', () => {
    it('sets velocity to (sin * speed, -cos * speed) from player angle', () => {
      const angle = HALF_PI;
      const creationTime = 5000;
      const id = 'testprojectile';
      const player = createTestLocalPlayerWithWeapon({ x: 0, y: 0, angle }, id);

      const attacks = createProjectileAttack(player, mockGameConfig, creationTime);

      expect(attacks).toHaveLength(1);
      const projectile = attacks[0];
      expect(projectile.ownerId).toBe(id);
      expect(projectile.type).toBe(AttackTypeValue.Projectile);
      expect(projectile.creationTime).toBe(creationTime);
      expect(projectile.lifetime).toBe(mockGameConfig.projectileLifetime);
      expect(projectile.velocityVector.x).toBeCloseTo(mockGameConfig.projectileSpeed * Math.sin(angle));
      expect(projectile.velocityVector.y).toBeCloseTo(-mockGameConfig.projectileSpeed * Math.cos(angle));
    });
  });

  describe('createSpecialAttack', () => {
    it('uses specialSpeed for velocity components', () => {
      const angle = 0;
      const creationTime = 6000;
      const id = 'testspecial';
      const player = createTestLocalPlayerWithWeapon({ x: 500, y: 500, angle }, id);
      const attacks = createSpecialAttack(player, mockGameConfig, creationTime);

      const special = attacks[0];
      expect(special.ownerId).toBe(id);
      expect(special.type).toBe(AttackTypeValue.Special);
      expect(special.creationTime).toBe(creationTime);
      expect(special.lifetime).toBe(mockGameConfig.specialLifetime);
      expect(special.velocityVector.x).toBeCloseTo(0);
      expect(special.velocityVector.y).toBeCloseTo(-mockGameConfig.specialSpeed);
    });
  });

  describe('createMeleeAttack', () => {
    it('spawns melee with zero velocity and meleeLifetime from config', () => {
      const creationTime = 7000;
      const id = 'testmelee';
      const player = createTestLocalPlayerWithWeapon({ x: 100, y: 100, angle: 0 }, id);
      const attacks = createMeleeAttack(player, mockGameConfig, creationTime);

      const melee = attacks[0];
      expect(melee.ownerId).toBe(id);
      expect(melee.type).toBe(AttackTypeValue.Melee);
      expect(melee.creationTime).toBe(creationTime);
      expect(melee.lifetime).toBe(mockGameConfig.meleeLifetime);
      expect(melee.velocityVector.x).toBe(0);
      expect(melee.velocityVector.y).toBe(0);
    });
  });
});
