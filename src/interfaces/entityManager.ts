import { Entity } from '../entity';
import { Position } from '../messageInterfaces';

export interface EntityManager {
  getEntities(): Entity[];
  getOtherPlayers(): Map<string, Entity>;
  getLocalPlayer(): Entity | null;
  addEntity(entity: Entity): void;
  removeEntity(entity: Entity): void;
  getEntityByPlayerId(playerId: string): Entity | undefined;
  clearEntities(): void;
  createLocalPlayer(position: Position, scale: number, spriteVariant?: number): Promise<Entity>;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSprite(spriteVariant: number): Promise<void>;
  getLocalPlayerSpriteVariant(): number;
  setLocalPlayerSpriteVariant(variant: number): void;
  createOtherPlayer(playerId: string, position: Position, scale: number, spriteVariant?: number): Promise<Entity>;
  updateOrCreateOtherPlayer(
    playerId: string,
    position: Position,
    scale?: number,
    spriteVariant?: number,
  ): Promise<{ entity: Entity; wasCreated: boolean }>;
  removeOtherPlayer(playerId: string): boolean;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, position?: Position): void;
}
