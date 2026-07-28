import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerEntityManager } from './playerEntityManager';
import type { SpriteManager } from './interfaces/spriteManager';
import type { Position, SpriteData } from './interfaces/messageInterfaces';

const spriteData: SpriteData = { url: '/sprite.png', width: 10, height: 10, scaleFactor: 1 };
const position: Position = { x: 0, y: 0, angle: 0 };
const fakeSprite = { width: 10, height: 10 } as ImageBitmap;

function createSpriteManager(): SpriteManager {
  return { getSpriteImage: vi.fn().mockResolvedValue(fakeSprite) };
}

describe('PlayerEntityManager', () => {
  let sut: PlayerEntityManager;

  beforeEach(() => {
    sut = new PlayerEntityManager(createSpriteManager(), position, spriteData, fakeSprite);
  });

  describe('hidePlayer / showPlayer for the local player', () => {
    it('removes the local player entity from the render list', () => {
      const localId = sut.getLocalPlayerEntity().id;

      sut.hidePlayer(localId);

      expect(sut.getEntities()).not.toContain(sut.getLocalPlayerEntity());
    });

    it('re-adds and repositions the local player entity on showPlayer', () => {
      const localId = sut.getLocalPlayerEntity().id;
      sut.hidePlayer(localId);
      const respawnPosition: Position = { x: 42, y: 99, angle: 1 };

      sut.showPlayer(localId, respawnPosition);

      expect(sut.getEntities()).toContain(sut.getLocalPlayerEntity());
      expect(sut.getLocalPlayerEntity().position).toStrictEqual(respawnPosition);
    });

    it('does not duplicate the local player entity if shown while already visible', () => {
      const localId = sut.getLocalPlayerEntity().id;

      sut.showPlayer(localId, { x: 1, y: 2, angle: 0 });

      const occurrences = sut.getEntities().filter((e) => e === sut.getLocalPlayerEntity());
      expect(occurrences).toHaveLength(1);
    });
  });

  describe('hidePlayer / showPlayer for a remote player', () => {
    it('hide and show remote player returns the same instance and changes position', async () => {
      await sut.createRemotePlayer('remote_1', position, spriteData);
      const remoteEntity = sut.getEntityById('remote_1');
      expect(remoteEntity).toBeDefined();

      sut.hidePlayer('remote_1');
      expect(sut.getEntities()).not.toContain(remoteEntity);

      sut.showPlayer('remote_1', { x: 5, y: 6, angle: 0 });
      expect(sut.getEntities()).toContain(remoteEntity);
      expect(remoteEntity?.position).toStrictEqual({ x: 5, y: 6, angle: 0 });
    });
  });
});
