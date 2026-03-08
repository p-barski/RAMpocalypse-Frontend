import { Time } from './interfaces/time';
import { EntityManager } from './interfaces/entityManager';
import { EntityAnimationController } from './entityAnimationController';
import { Entity } from './entity';

describe('PlayerMovementController', () => {
  let animationController: EntityAnimationController;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockTime: Time;
  beforeEach(() => {
    mockEntityManager = {
      getLocalPlayerEntity: jest.fn(),
      getEntities: jest.fn(),
      getEntityById: jest.fn(),
      clearRemoteEntities: jest.fn(),
      updateLocalPlayerId: jest.fn(),
      updateLocalPlayerPosition: jest.fn(),
      updateLocalPlayerSprite: jest.fn(),
      updateLocalPlayerSubEntities: jest.fn(),
      createRemotePlayer: jest.fn(),
      updateEntityPosition: jest.fn(),
      removeRemotePlayer: jest.fn(),
      hidePlayer: jest.fn(),
      showPlayer: jest.fn(),
    };

    mockTime = {
      averageFrameTime: 0,
      frameTimestamp: 0,
      deltaTime: 0,
    };
    animationController = new EntityAnimationController(mockEntityManager, mockTime);
  });

  describe('meleeAnimation', () => {
    it('entity is rotated up, attack should go up', () => {
      const mockWeapon = {
        id: 'weapon_mock',
        position: { x: 100, y: 200, angle: 0 },
      } as Entity;
      const mockEntity = { width: 100, height: 50, subEntities: [mockWeapon] } as Entity;

      mockEntityManager.getEntityById.mockImplementation((id: string) => mockEntity);
      animationController.createMeleeAttackAnimation('');
      (mockTime as any).frameTimestamp = 0.5 * 700;
      const animatedEnttiy = animationController.getAnimatedEntity(mockWeapon);
      expect(animatedEnttiy.position.x).toStrictEqual(mockWeapon.position.x - mockEntity.width / 2);
      expect(animatedEnttiy.position.y).toStrictEqual(mockWeapon.position.y - mockEntity.height / 2);
      expect(animatedEnttiy.position.angle).toStrictEqual(mockWeapon.position.angle + Math.PI);
    });

    it('entity is rotated down, attack should go down', () => {
      const mockWeapon = {
        id: 'weapon_mock',
        position: { x: 100, y: 200, angle: Math.PI },
      } as Entity;
      const mockEntity = { width: 100, height: 50, subEntities: [mockWeapon] } as Entity;

      mockEntityManager.getEntityById.mockImplementation((id: string) => mockEntity);
      animationController.createMeleeAttackAnimation('');
      (mockTime as any).frameTimestamp = 0.5 * 700;
      const animatedEnttiy = animationController.getAnimatedEntity(mockWeapon);
      expect(animatedEnttiy.position.x).toStrictEqual(mockWeapon.position.x + mockEntity.width / 2);
      expect(animatedEnttiy.position.y).toStrictEqual(mockWeapon.position.y + mockEntity.height / 2);
      expect(animatedEnttiy.position.angle).toStrictEqual(mockWeapon.position.angle + Math.PI);
    });
  });
});
