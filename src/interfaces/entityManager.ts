import type { Entity } from './entity';
import type { Position, SpriteData, SubEntity } from './messageInterfaces';

export type Arm = 'left' | 'right';

export interface EntityManager {
  getEntities(): Entity[];
  getEntityById(id: string): Entity | undefined;
  getLocalPlayerEntity(): Entity;
  clearRemoteEntities(): void;
  updateLocalPlayerId(playerId: string): void;
  updateLocalPlayerPosition(position: Position): void;
  updateLocalPlayerSubEntities(subEntities: SubEntity[]): Promise<void>;
  updateLocalPlayerSprite(spriteData: SpriteData): Promise<void>;
  updateEntityPosition(id: string, position: Position): void;
  createRemoteEntity(id: string, position: Position, spriteData: SpriteData, subEntities: SubEntity[]): Promise<void>;
  removeRemoteEntity(id: string): void;
  hidePlayer(playerId: string): void;
  showPlayer(playerId: string, position: Position): void;
  switchWeaponArm(playerId: string): void;
  setWeaponArm(playerId: string, arm: Arm): void;
}
