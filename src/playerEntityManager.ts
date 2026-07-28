import type { EntityManager } from './interfaces/entityManager';
import type { SpriteManager } from './interfaces/spriteManager';
import type { Entity } from './interfaces/entity';
import type { Position, SpriteData, SubEntity } from './interfaces/messageInterfaces';

export class PlayerEntityManager implements EntityManager {
  private readonly spriteManager: SpriteManager;
  private readonly entities: Entity[] = [];
  private readonly remoteEntities: Map<string, Entity> = new Map();
  private readonly localPlayerEntity: Entity;

  constructor(spriteManager: SpriteManager, position: Position, spriteData: SpriteData, sprite: ImageBitmap) {
    this.spriteManager = spriteManager;
    this.localPlayerEntity = {
      id: `player_${crypto.randomUUID()}`,
      position,
      image: sprite,
      width: sprite.width * spriteData.scaleFactor,
      height: sprite.height * spriteData.scaleFactor,
      spriteData: spriteData,
      subEntities: [],
    };
    this.entities.push(this.localPlayerEntity);
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getEntityById(id: string): Entity | undefined {
    if (id === this.localPlayerEntity.id) {
      return this.localPlayerEntity;
    }
    return this.remoteEntities.get(id);
  }

  getLocalPlayerEntity(): Entity {
    return this.localPlayerEntity;
  }

  clearRemoteEntities(): void {
    for (const entity of Array.from(this.remoteEntities.values())) {
      this.removeEntity(entity);
    }
  }

  async createEntity(
    id: string,
    position: Position,
    spriteData: SpriteData,
    subEntities: SubEntity[] = [],
    startAtFront = false,
  ): Promise<void> {
    const entity = await this.createEntityInternal(id, position, spriteData, subEntities);
    if (startAtFront) {
      this.entities.unshift(entity);
    } else {
      this.entities.push(entity);
    }
  }

  updateLocalPlayerId(playerId: string): void {
    this.localPlayerEntity.id = playerId;
  }

  updateLocalPlayerPosition(position: Position): void {
    this.localPlayerEntity.position = position;
  }

  async addDefaultWeaponToLocalPlayer(weaponSpriteData: SpriteData) {
    const weaponId = `weapon_${this.localPlayerEntity.id}`;
    const weaponOffset = {
      x: this.localPlayerEntity.width / 2 - (weaponSpriteData.width * weaponSpriteData.scaleFactor) / 2,
      y: 0,
      angle: 0,
    } satisfies Position;
    const weaponEntity = await this.createEntityInternal(weaponId, weaponOffset, weaponSpriteData);
    this.localPlayerEntity.subEntities.push(weaponEntity);
  }

  async updateLocalPlayerSubEntities(subEntities: SubEntity[]): Promise<void> {
    this.localPlayerEntity.subEntities = [];
    for (const subEntity of subEntities) {
      const entity = await this.createEntityInternal(
        subEntity.id,
        subEntity.position,
        subEntity.spriteData,
        subEntity.subEntities,
      );
      this.localPlayerEntity.subEntities.push(entity);
    }
  }

  async updateLocalPlayerSprite(spriteData: SpriteData): Promise<void> {
    const sprite = await this.spriteManager.getSpriteImage(spriteData);
    this.localPlayerEntity.image = sprite;
    this.localPlayerEntity.spriteData = spriteData;
    this.localPlayerEntity.width = sprite.width * spriteData.scaleFactor;
    this.localPlayerEntity.height = sprite.height * spriteData.scaleFactor;
  }

  updateEntityPosition(id: string, position: Position): void {
    const existingEntity = this.remoteEntities.get(id);

    if (existingEntity) {
      existingEntity.position = position;
    } else {
      console.error(`PlayerEntityManager.updatePlayerPosition: Player with id ${id} not found`);
    }
  }

  async createRemotePlayer(
    playerId: string,
    position: Position,
    spriteData: SpriteData,
    subEntities: SubEntity[] = [],
  ): Promise<void> {
    const entity = await this.createEntityInternal(playerId, position, spriteData, subEntities);
    this.remoteEntities.set(playerId, entity);
    this.entities.splice(this.entities.length - 1, 0, entity);
  }

  removeRemotePlayer(playerId: string): void {
    const entity = this.remoteEntities.get(playerId);
    if (entity) this.removeEntity(entity);
  }

  hidePlayer(playerId: string): void {
    const entity = this.getEntityById(playerId);
    if (entity) {
      const index = this.entities.indexOf(entity);
      if (index > -1) {
        this.entities.splice(index, 1);
      }
    }
  }

  showPlayer(playerId: string, position: Position): void {
    const entity = this.getEntityById(playerId);
    if (entity) {
      entity.position = position;

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
    if (entity.id) {
      this.remoteEntities.delete(entity.id);
    }
  }

  private async createEntityInternal(
    id: string,
    position: Position,
    spriteData: SpriteData,
    subEntities: SubEntity[] = [],
  ): Promise<Entity> {
    const sprite = await this.spriteManager.getSpriteImage(spriteData);
    const entity: Entity = {
      id: id,
      position,
      image: sprite,
      width: sprite.width * spriteData.scaleFactor,
      height: sprite.height * spriteData.scaleFactor,
      spriteData,
      subEntities: [],
    };
    for (const subEntity of subEntities) {
      const subEntityEntity = await this.createEntityInternal(
        subEntity.id,
        subEntity.position,
        subEntity.spriteData,
        subEntity.subEntities,
      );
      entity.subEntities.push(subEntityEntity);
    }
    return entity;
  }
}
