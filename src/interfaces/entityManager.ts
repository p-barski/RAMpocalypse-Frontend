import { Entity } from '../entity';

export interface EntityManager {
  getEntities(): Entity[];
  getOtherPlayers(): Map<string, Entity>;
  getLocalPlayer(): Entity | null;
  addEntity(entity: Entity): void;
  removeEntity(entity: Entity): void;
  getEntityByPlayerId(playerId: string): Entity | undefined;
  clearEntities(): void;
  createLocalPlayer(x: number, y: number, scale: number, spriteVariant?: number): Promise<Entity>;
  updateLocalPlayerPosition(x: number, y: number): void;
  updateLocalPlayerSprite(spriteVariant: number): Promise<void>;
  getLocalPlayerSpriteVariant(): number;
  setLocalPlayerSpriteVariant(variant: number): void;
  createOtherPlayer(playerId: string, x: number, y: number, scale: number, spriteVariant?: number): Promise<Entity>;
  updateOrCreateOtherPlayer(
    playerId: string,
    x: number,
    y: number,
    scale?: number,
    spriteVariant?: number,
  ): Promise<{ entity: Entity; wasCreated: boolean }>;
  removeOtherPlayer(playerId: string): boolean;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, x?: number, y?: number): void;
}
