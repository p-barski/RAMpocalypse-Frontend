import type { AttackController } from './interfaces/attackController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { Time } from './interfaces/time';
import type { CommunicationService } from './interfaces/communicatonService';
import type { GameConfig } from './interfaces/gameConfig';
import type { AttackType, AttackEntity } from './interfaces/messageInterfaces';
import { AttackTypeValue } from './interfaces/messageInterfaces';

export class PlayerAttackController implements AttackController {
  private readonly COOLDOWNS_MAP: ReadonlyMap<AttackType, number>;
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly communicationService: CommunicationService;
  private readonly gameStateManager: StateManager;
  private readonly time: Time;

  private readonly attackCooldowns: Map<AttackType, number> = new Map([
    [AttackTypeValue.Melee, 0],
    [AttackTypeValue.Projectile, 0],
    [AttackTypeValue.Special, 0],
  ]);

  private readonly attacks: Map<string, AttackEntity> = new Map();
  private readonly ownProjectiles: Map<string, AttackEntity> = new Map();

  constructor(
    gameConfig: GameConfig,
    entityManager: EntityManager,
    communicationService: CommunicationService,
    gameStateManager: StateManager,
    time: Time,
  ) {
    this.gameConfig = gameConfig;
    this.entityManager = entityManager;
    this.communicationService = communicationService;
    this.gameStateManager = gameStateManager;
    this.time = time;
    this.COOLDOWNS_MAP = new Map([
      [AttackTypeValue.Melee, this.gameConfig.meleeCooldownMs],
      [AttackTypeValue.Projectile, this.gameConfig.projectileCooldownMs],
      [AttackTypeValue.Special, this.gameConfig.specialCooldownMs],
    ]);
  }

  performMeleeAttack(): void {
    if (!this.canPerformAttack(AttackTypeValue.Melee)) return;
    this.setCooldown(AttackTypeValue.Melee);
    this.communicationService.performMeleeAttack();
  }

  performProjectileAttack(): void {
    if (!this.canPerformAttack(AttackTypeValue.Projectile)) return;
    this.setCooldown(AttackTypeValue.Projectile);
    this.communicationService.performProjectileAttack();
  }

  performSpecialAttack(): void {
    if (!this.canPerformAttack(AttackTypeValue.Special)) return;
    this.setCooldown(AttackTypeValue.Special);
    this.communicationService.performSpecialAttack();
  }

  getCooldownRemaining(attackType: AttackType): number {
    const cooldownEnd = this.attackCooldowns.get(attackType) as number;
    return Math.max(0, cooldownEnd - this.time.frameTimestamp);
  }

  canPerformAttack(attackType: AttackType): boolean {
    if (!this.gameStateManager.isPlaying()) return false;

    const cooldownEnd = this.attackCooldowns.get(attackType) as number;
    return this.time.frameTimestamp >= cooldownEnd;
  }

  addAttack(attackEntity: AttackEntity): void {
    if (attackEntity.type === AttackTypeValue.ProjectileHit) {
      this.attacks.delete(attackEntity.id);
      return;
    }
    if (
      attackEntity.type === AttackTypeValue.Projectile &&
      attackEntity.ownerId === this.entityManager.getLocalPlayerEntity().id
    ) {
      this.ownProjectiles.set(attackEntity.id, attackEntity);
    }
    this.attacks.set(attackEntity.id, attackEntity);
  }

  getAttacks(): AttackEntity[] {
    return Array.from(this.attacks.values());
  }

  update(): void {
    const toRemove: string[] = [];

    for (const [id, attack] of this.attacks) {
      const age = this.time.frameTimestamp - attack.creationTime;
      if (age >= attack.lifetime) {
        toRemove.push(id);
        this.ownProjectiles.delete(id);
      } else {
        attack.currentPosition.x += attack.velocityVector.x * this.time.deltaTime;
        attack.currentPosition.y += attack.velocityVector.y * this.time.deltaTime;
      }
    }

    if (this.ownProjectiles.size > 0) {
      const entities = this.entityManager.getEntities();
      const localPlayer = this.entityManager.getLocalPlayerEntity();
      for (const entity of entities) {
        if (entity.id != localPlayer.id && entity.id.startsWith('player_')) {
          const halfWidth = entity.width / 2;
          const halfHeight = entity.height / 2;
          const cos = Math.cos(-entity.position.angle);
          const sin = Math.sin(-entity.position.angle);
          for (const [id, attack] of this.ownProjectiles) {
            const dx = attack.currentPosition.x - entity.position.x;
            const dy = attack.currentPosition.y - entity.position.y;
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
              this.communicationService.projectileHitPlayer(attack.id, entity.id);
              toRemove.push(id);
              break;
            }
          }
        }
      }
    }

    for (const id of toRemove) {
      this.attacks.delete(id);
      this.ownProjectiles.delete(id);
    }
  }

  clear(): void {
    this.attacks.clear();
  }

  private setCooldown(attackType: AttackType): void {
    const cooldownDuration = this.COOLDOWNS_MAP.get(attackType) as number;
    this.attackCooldowns.set(attackType, this.time.frameTimestamp + cooldownDuration);
  }
}
