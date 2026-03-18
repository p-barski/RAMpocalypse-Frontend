import type { Entity } from '../entity';
import type { Position, SpriteData, SubEntity } from '../messageInterfaces';

export interface EntityManager {
  getEntities(): Entity[];
  getEntityById(id: string): Entity | undefined;
  getLocalPlayerEntity(): Entity;
  clearRemoteEntities(): void;
  updateLocalPlayerId(playerId: string): void;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSubEntities(subEntities: SubEntity[]): Promise<void>;
  updateLocalPlayerSprite(spriteData: SpriteData): Promise<void>;
  updateEntityPosition(playerId: string, position: Position): void;
  createRemotePlayer(
    playerId: string,
    position: Position,
    spriteData: SpriteData,
    subEntities: SubEntity[],
  ): Promise<void>;
  removeRemotePlayer(playerId: string): void;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, position: Position): void;
}
