import { Entity } from '../entity';
import { Position, SpriteData, SubEntity } from '../messageInterfaces';

export interface EntityManager {
  getEntities(): Entity[];
  getLocalPlayer(): Entity;
  clearOtherPlayers(): void;
  updateLocalPlayerId(playerId: string): void;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSprite(spriteData: SpriteData): Promise<void>;
  updateLocalPlayerSubEntities(subEntities: SubEntity[]): Promise<void>;
  createOtherPlayer(
    playerId: string,
    position: Position,
    spriteData: SpriteData,
    subEntities: SubEntity[],
  ): Promise<void>;
  updatePlayerPosition(playerId: string, position: Position): void;
  removeOtherPlayer(playerId: string): boolean;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, position: Position): void;
}
