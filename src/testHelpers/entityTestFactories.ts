import type { Entity } from '../interfaces/entity';
import type { Position } from '../interfaces/messageInterfaces';

export const EMPTY_IMAGE_BITMAP = {} as ImageBitmap;

export function createTestWeapon(
  sprite: { width: number; height: number; scaleFactor: number },
  position: { x: number; y: number } = { x: 0, y: 0 },
  image: ImageBitmap = EMPTY_IMAGE_BITMAP,
): Entity {
  return {
    id: 'weapon',
    position: { x: position.x, y: position.y, angle: 0 },
    spriteData: {
      url: 'weapon_test.png',
      width: sprite.width,
      height: sprite.height,
      scaleFactor: sprite.scaleFactor,
    },
    subEntities: [],
    image,
    width: sprite.width * sprite.scaleFactor,
    height: sprite.height * sprite.scaleFactor,
  } as Entity;
}

export function createTestLocalPlayerWithWeapon(
  position: Position = { x: 0, y: 0, angle: 0 },
  id: string = 'player_test',
): Entity {
  const image = EMPTY_IMAGE_BITMAP;
  const weapon = createTestWeapon({ width: 32, height: 16, scaleFactor: 1 }, { x: 10, y: 0 }, image);
  const width = 64;
  const height = 64;
  return {
    id,
    position,
    image,
    width,
    height,
    spriteData: { url: 'player_test.png', width, height, scaleFactor: 1 },
    subEntities: [weapon],
  };
}
