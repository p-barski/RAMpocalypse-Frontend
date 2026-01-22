import { Entity } from '../entity';
import { Position } from '../messageInterfaces';

export interface EntityManager {
  getEntities(): Entity[];
  getLocalPlayer(): Entity | null;
  clearEntities(): void;
  createLocalPlayer(position: Position, scale: number, spriteVariant: number): Promise<Entity>;
  updateLocalPlayerId(playerId: string): void;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSprite(spriteVariant: number): Promise<void>;
  createOtherPlayer(playerId: string, position: Position, scale: number, spriteVariant: number): Promise<Entity>;
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
