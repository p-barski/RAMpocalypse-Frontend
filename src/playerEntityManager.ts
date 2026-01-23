import { EntityManager } from './interfaces/entityManager';
import { SpriteManager } from './interfaces/spriteManager';
import { Entity } from './entity';
import { Position } from './messageInterfaces';

export class PlayerEntityManager implements EntityManager {
  private readonly spriteManager: SpriteManager;
  private readonly entities: Entity[] = [];
  private readonly otherPlayers: Map<string, Entity> = new Map();
  private readonly defaultScale = 8;
  private readonly defaultSpriteVariant = 1;
  private localPlayer: Entity | null = null;

  constructor(spriteManager: SpriteManager) {
    this.spriteManager = spriteManager;
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getLocalPlayer(): Entity | null {
    return this.localPlayer;
  }

  clearEntities(): void {
    this.entities.length = 0;
    this.otherPlayers.clear();
    this.localPlayer = null;
  }

  /**
   * Creates and adds the local player entity
   */
  async createLocalPlayer(
    position: Position,
    scale = this.defaultScale,
    spriteVariant = this.defaultSpriteVariant,
  ): Promise<Entity> {
    const sprite = await this.spriteManager.getSpriteForVariant(spriteVariant);

    const entity: Entity = {
      position,
      image: sprite,
      scale,
      width: sprite.width * scale,
      height: sprite.height * scale,
      playerId: '',
      spriteVariant: spriteVariant,
    };

    this.localPlayer = entity;
    this.entities.push(entity);
    return entity;
  }

  updateLocalPlayerId(playerId: string): void {
    if (this.localPlayer) {
      this.localPlayer.playerId = playerId;
    }
  }

  /**
   * Creates and adds an entity for another player
   */
  async createOtherPlayer(playerId: string, position: Position, scale: number, spriteVariant: number): Promise<Entity> {
    const sprite = await this.spriteManager.getSpriteForVariant(spriteVariant);

    const entity: Entity = {
      position,
      image: sprite,
      scale,
      width: sprite.width * scale,
      height: sprite.height * scale,
      playerId,
      spriteVariant: spriteVariant,
    };

    this.otherPlayers.set(playerId, entity);
    this.entities.push(entity);
    return entity;
  }

  /**
   * Updates or creates an entity for another player
   * Returns true if the entity already existed, false if it was created
   */
  async updateOrCreateOtherPlayer(
    playerId: string,
    position: Position,
    scale = this.defaultScale,
    spriteVariant = this.defaultSpriteVariant,
  ): Promise<{ entity: Entity; wasCreated: boolean }> {
    const existingEntity = this.otherPlayers.get(playerId);

    if (existingEntity) {
      existingEntity.position = position;
      return { entity: existingEntity, wasCreated: false };
    }

    const entity = await this.createOtherPlayer(playerId, position, scale, spriteVariant);
    return { entity, wasCreated: true };
  }

  /**
   * Updates the local player's position
   */
  updateLocalPlayerPosition(position: Position): void {
    if (this.localPlayer) {
      this.localPlayer.position = position;
    }
  }

  /**
   * Updates the local player's sprite
   */
  async updateLocalPlayerSprite(spriteVariant: number): Promise<void> {
    if (!this.localPlayer) return;

    const sprite = await this.spriteManager.getSpriteForVariant(spriteVariant);
    this.localPlayer.image = sprite;
    this.localPlayer.spriteVariant = spriteVariant;
  }

  /**
   * Removes another player by their playerId
   */
  removeOtherPlayer(playerId: string): boolean {
    const entity = this.otherPlayers.get(playerId);
    if (entity) {
      this.removeEntity(entity);
      return true;
    }
    return false;
  }

  /**
   * Temporarily hides a player entity (e.g., when they die)
   * The entity remains in otherPlayers but is removed from the visible entities list
   */
  hidePlayer(playerId: string): void {
    const entity = this.otherPlayers.get(playerId);
    if (entity) {
      const index = this.entities.indexOf(entity);
      if (index > -1) {
        this.entities.splice(index, 1);
      }
    }
  }

  /**
   * Shows a previously hidden player entity
   */
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

    // Clear local player reference if removed
    if (entity === this.localPlayer) {
      this.localPlayer = null;
    }
  }
}
