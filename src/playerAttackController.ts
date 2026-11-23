import type { AttackController } from './interfaces/attackController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { Time } from './interfaces/time';
import type { CommunicationService } from './interfaces/communicatonService';
import type { GameConfig } from './interfaces/gameConfig';
import type { AttackType, AttackEntity, SpriteData } from './interfaces/messageInterfaces';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import { clamp } from './mathUtils';
import type { AnimationController } from './interfaces/animationController';
import type { AudioController } from './interfaces/audioController';

export class PlayerAttackController implements AttackController {
  private readonly COOLDOWNS_MAP: ReadonlyMap<AttackType, number>;
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly communicationService: CommunicationService;
  private readonly gameStateManager: StateManager;
  private readonly animationController: AnimationController;
  private readonly audioController: AudioController;
  private readonly attackSprites: Map<AttackType, SpriteData>;
  private readonly time: Time;

  private readonly attackCooldowns: Map<AttackType, number> = new Map([
    [AttackTypeValue.Melee, 0],
    [AttackTypeValue.Projectile, 0],
    [AttackTypeValue.Special, 0],
  ]);

  private readonly attacks: Map<string, AttackEntity> = new Map();
  private readonly ownProjectiles: Map<string, AttackEntity> = new Map();
  private sharedAttackCooldownEnd = 0;
  private armSwitchEnd = 0;

  constructor(
    gameConfig: GameConfig,
    entityManager: EntityManager,
    communicationService: CommunicationService,
    gameStateManager: StateManager,
    animationController: AnimationController,
    audioController: AudioController,
    time: Time,
    attackSprites: Map<AttackType, SpriteData>,
  ) {
    this.gameConfig = gameConfig;
    this.entityManager = entityManager;
    this.communicationService = communicationService;
    this.gameStateManager = gameStateManager;
    this.animationController = animationController;
    this.audioController = audioController;
    this.time = time;
    this.attackSprites = attackSprites;
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

  switchArm(): void {
    if (this.isBlocked()) return;

    this.armSwitchEnd = this.time.frameTimestamp + this.gameConfig.armSwitchDurationMs;
    this.communicationService.switchArm();
  }

  getArmSwitchCdRemaining(): number {
    return Math.max(0, this.armSwitchEnd - this.time.frameTimestamp);
  }

  getCooldownRemaining(attackType: AttackType): number {
    const cooldownEnd = this.attackCooldowns.get(attackType) as number;
    const cooldownRemaining = cooldownEnd - this.time.frameTimestamp;
    const sharedCooldownRemaining = this.sharedAttackCooldownEnd - this.time.frameTimestamp;
    return Math.max(0, cooldownRemaining, sharedCooldownRemaining, this.getArmSwitchCdRemaining());
  }

  canPerformAttack(attackType: AttackType): boolean {
    if (this.isBlocked()) return false;

    const cooldownEnd = this.attackCooldowns.get(attackType) as number;
    return this.time.frameTimestamp >= cooldownEnd;
  }

  addAttack(attackEntity: AttackEntity): void {
    switch (attackEntity.type) {
      case AttackTypeValue.ProjectileHit:
        this.attacks.delete(attackEntity.id);
        this.entityManager.removeRemoteEntity(attackEntity.id);
        //TODO add hit and animation idk
        return;
      // @ts-expect-error fallthrough
      case AttackTypeValue.Projectile:
        if (attackEntity.ownerId === this.entityManager.getLocalPlayerEntity().id)
          this.ownProjectiles.set(attackEntity.id, attackEntity);
      //fallthrough
      case AttackTypeValue.Special: {
        const delta = (this.time.frameTimestamp - attackEntity.creationTime) / 1000;
        attackEntity.currentPosition.x += attackEntity.velocityVector.x * delta;
        attackEntity.currentPosition.y += attackEntity.velocityVector.y * delta;
        break;
      }
    }
    this.entityManager.createRemoteEntity(
      attackEntity.id,
      attackEntity.currentPosition,
      this.attackSprites.get(attackEntity.type)!,
      [],
    );
    this.attacks.set(attackEntity.id, attackEntity);
  }

  getAttacks(): AttackEntity[] {
    return Array.from(this.attacks.values());
  }

  update(): void {
    const toRemove: AttackEntity[] = [];

    for (const [id, attack] of this.attacks) {
      const age = this.time.frameTimestamp - attack.creationTime;
      if (age >= attack.lifetime) {
        toRemove.push(attack);
        if (attack.type === AttackTypeValue.Special && attack.ownerId === this.entityManager.getLocalPlayerEntity().id)
          this.communicationService.specialExplosion(id);
        continue;
      }

      attack.currentPosition.x += attack.velocityVector.x * this.time.deltaTime;
      attack.currentPosition.y += attack.velocityVector.y * this.time.deltaTime;
      if (attack.type == AttackTypeValue.Special) {
        const range = this.gameConfig.specialRange;
        attack.currentPosition.x = clamp(attack.currentPosition.x, range, this.gameConfig.gameWidth - range);
        attack.currentPosition.y = clamp(attack.currentPosition.y, range, this.gameConfig.gameHeight - range);
        continue;
      }
      const isOutsidePlayableArea =
        attack.currentPosition.x > this.gameConfig.gameWidth ||
        attack.currentPosition.y > this.gameConfig.gameHeight ||
        attack.currentPosition.x < 0 ||
        attack.currentPosition.y < 0;
      if (isOutsidePlayableArea) {
        toRemove.push(attack);
      }
      this.entityManager.updateEntityPosition(attack.id, attack.currentPosition);
    }

    if (this.ownProjectiles.size > 0) {
      const entities = this.entityManager.getEntities();
      const localPlayer = this.entityManager.getLocalPlayerEntity();
      for (const entity of entities) {
        if (entity.id != localPlayer.id && entity.id.startsWith('player_')) {
          const halfWidth = entity.width / 2;
          const halfHeight = entity.height / 2;
          for (const [_, attack] of this.ownProjectiles) {
            const dx = attack.currentPosition.x - entity.position.x;
            const dy = attack.currentPosition.y - entity.position.y;
            if (Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight) {
              this.communicationService.projectileHitPlayer(attack.id, entity.id);
              toRemove.push(attack);
            }
          }
        }
      }
    }

    for (const attack of toRemove) {
      if (attack.type === AttackTypeValue.Special) {
        this.audioController.playShortRunningSound('/app/special_explosion.mp3', 0.3);
        this.animationController.createExplosionAnimation(attack.id);
        setTimeout(() => {
          this.entityManager.removeRemoteEntity(attack.id);
        }, this.gameConfig.explosionLifetimeMs);
      } else {
        this.entityManager.removeRemoteEntity(attack.id);
      }
      this.attacks.delete(attack.id);
      this.ownProjectiles.delete(attack.id);
    }
  }

  clear(): void {
    this.attacks.clear();
  }

  private setCooldown(attackType: AttackType): void {
    const cooldownDuration = this.COOLDOWNS_MAP.get(attackType) as number;
    this.attackCooldowns.set(attackType, this.time.frameTimestamp + cooldownDuration);
    this.sharedAttackCooldownEnd = this.time.frameTimestamp + this.gameConfig.sharedAttackCooldownMs;
  }

  private isBlocked(): boolean {
    if (!this.gameStateManager.isPlaying()) return true;
    if (this.time.frameTimestamp < this.sharedAttackCooldownEnd) return true;
    if (this.time.frameTimestamp < this.armSwitchEnd) return true;
    return false;
  }
}
