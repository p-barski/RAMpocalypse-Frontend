import { Entity } from '../entity';
import { Position, SpriteData } from '../messageInterfaces';

export interface EntityManager {
  getEntities(): Entity[];
  getLocalPlayer(): Entity | null;
  clearEntities(): void;
  createLocalPlayer(position: Position, spriteData: SpriteData): Promise<Entity>;
  updateLocalPlayerId(playerId: string): void;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSprite(spriteData: SpriteData): Promise<void>;
  createOtherPlayer(playerId: string, position: Position, spriteData: SpriteData): Promise<Entity>;
  updatePlayerPosition(playerId: string, position: Position): Promise<Entity>;
  removeOtherPlayer(playerId: string): boolean;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, position: Position): void;
}
