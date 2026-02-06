import { EntityManager } from './interfaces/entityManager';
import { SpriteManager } from './interfaces/spriteManager';
import { Entity } from './entity';
import { Position, SpriteData } from './messageInterfaces';

export class PlayerEntityManager implements EntityManager {
  private readonly spriteManager: SpriteManager;
  private readonly entities: Entity[] = [];
  private readonly otherPlayers: Map<string, Entity> = new Map();
  private readonly localPlayer: Entity;

  constructor(spriteManager: SpriteManager, position: Position, spriteData: SpriteData, sprite: ImageBitmap) {
    this.spriteManager = spriteManager;
    this.localPlayer = {
      position,
      image: sprite,
      width: sprite.width * spriteData.scaleFactor,
      height: sprite.height * spriteData.scaleFactor,
      playerId: '',
      spriteData: spriteData,
    };
    this.entities.push(this.localPlayer);
  }

  async createEntity(position: Position, spriteData: SpriteData, startAtFront = false): Promise<void> {
    const sprite = await this.spriteManager.getSpriteForVariant(spriteData);
    const entity: Entity = {
      position,
      image: sprite,
      width: sprite.width * spriteData.scaleFactor,
      height: sprite.height * spriteData.scaleFactor,
      playerId: '',
      spriteData: spriteData,
    };
    if (startAtFront) {
      this.entities.unshift(entity);
    } else {
      this.entities.push(entity);
    }
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getLocalPlayer(): Entity {
    return this.localPlayer;
  }

  clearOtherPlayers(): void {
    for (const entity of Array.from(this.otherPlayers.values())) {
      this.removeEntity(entity);
    }
  }

  updateLocalPlayerId(playerId: string): void {
    this.localPlayer.playerId = playerId;
  }

  async createOtherPlayer(playerId: string, position: Position, spriteData: SpriteData): Promise<Entity> {
    const sprite = await this.spriteManager.getSpriteForVariant(spriteData);

    const entity: Entity = {
      position,
      image: sprite,
      width: sprite.width * spriteData.scaleFactor,
      height: sprite.height * spriteData.scaleFactor,
      playerId,
      spriteData: spriteData,
    };

    this.otherPlayers.set(playerId, entity);
    this.entities.push(entity);
    return entity;
  }

  updatePlayerPosition(playerId: string, position: Position): void {
    const existingEntity = this.otherPlayers.get(playerId);

    if (existingEntity) {
      existingEntity.position = position;
    } else {
      console.error(`PlayerEntityManager.updatePlayerPosition:Player with id ${playerId} not found`);
    }
  }

  updateLocalPlayerPosition(position: Position): void {
    this.localPlayer.position = position;
  }

  async updateLocalPlayerSprite(spriteData: SpriteData): Promise<void> {
    const sprite = await this.spriteManager.getSpriteForVariant(spriteData);
    this.localPlayer.image = sprite;
    this.localPlayer.spriteData = spriteData;
    this.localPlayer.width = sprite.width * spriteData.scaleFactor;
    this.localPlayer.height = sprite.height * spriteData.scaleFactor;
  }

  removeOtherPlayer(playerId: string): boolean {
    const entity = this.otherPlayers.get(playerId);
    if (entity) {
      this.removeEntity(entity);
      return true;
    }
    return false;
  }

  hidePlayer(playerId: string): void {
    const entity = this.otherPlayers.get(playerId);
    if (entity) {
      const index = this.entities.indexOf(entity);
      if (index > -1) {
        this.entities.splice(index, 1);
      }
    }
  }

  showPlayer(playerId: string, position: Position): void {
    const entity = this.otherPlayers.get(playerId);
    if (entity) {
      if (position !== undefined) {
        entity.position = position;
      }

      if (!this.entities.includes(entity)) {
        this.entities.push(entity);
      }
    }
  }

  private removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }

    // Also remove from otherPlayers if it has a playerId
    if (entity.playerId) {
      this.otherPlayers.delete(entity.playerId);
    }
  }
}
