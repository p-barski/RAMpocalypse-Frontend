import { AttackController, AttackEntity, PROJECTILE_SPEED } from './interfaces/attackController';
import { StateManager } from './interfaces/stateManager';
import { Time } from './interfaces/time';
import { CommunicationService } from './communicatonService';
import { AttackType, Position } from './messageInterfaces';
import { calculateDirectionVector } from './mathUtils';

export class PlayerAttackController implements AttackController {
  private readonly COOLDOWNS_MAP: ReadonlyMap<AttackType, number> = new Map([
    [AttackType.Melee, 50],
    [AttackType.Projectile, 100],
    [AttackType.Special, 300],
  ]);
  private readonly LIFETIME_MAP: ReadonlyMap<AttackType, number> = new Map([
    [AttackType.Melee, 200],
    [AttackType.Projectile, 3000],
    [AttackType.Special, 1000],
  ]);
  private readonly communicationService: CommunicationService;
  private readonly gameStateManager: StateManager;
  private readonly time: Time;

  private readonly attackCooldowns: Map<AttackType, number> = new Map([
    [AttackType.Melee, 0],
    [AttackType.Projectile, 0],
    [AttackType.Special, 0],
  ]);

  private attacks: Map<string, AttackEntity> = new Map();
  private nextAttackId = 0;

  constructor(communicationService: CommunicationService, gameStateManager: StateManager, time: Time) {
    this.communicationService = communicationService;
    this.gameStateManager = gameStateManager;
    this.time = time;
  }

  performMeleeAttack(): void {
    if (!this.canPerformAttack(AttackType.Melee)) return;
    this.setCooldown(AttackType.Melee);
    this.communicationService.performMeleeAttack();
  }

  performProjectileAttack(): void {
    if (!this.canPerformAttack(AttackType.Projectile)) return;
    this.setCooldown(AttackType.Projectile);
    this.communicationService.performProjectileAttack();
  }

  performSpecialAttack(): void {
    if (!this.canPerformAttack(AttackType.Special)) return;
    this.setCooldown(AttackType.Special);
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

  addAttack(playerId: string, attackType: number, attackPositions: Position[]): string {
    const id = `attack_${this.nextAttackId++}`;
    const speed = PROJECTILE_SPEED * +(attackType === AttackType.Projectile);
    for (const position of attackPositions) {
      const velocityVector = calculateDirectionVector(position);
      velocityVector.x *= speed;
      velocityVector.y *= speed;
      const attackEntity: AttackEntity = {
        id,
        type: attackType,
        currentPosition: position,
        velocityVector,
        ownerId: playerId,
        lifetime: this.LIFETIME_MAP.get(attackType) as number,
        createdAt: this.time.frameTimestamp,
      };

      this.attacks.set(id, attackEntity);
    }
    return id;
  }

  getAttacks(): AttackEntity[] {
    return Array.from(this.attacks.values());
  }

  update(deltaTime: number, currentFrameTime: number): void {
    const toRemove: string[] = [];

    for (const [id, attack] of Array.from(this.attacks.entries())) {
      const age = currentFrameTime - attack.createdAt;
      if (age >= attack.lifetime) {
        toRemove.push(id);
      } else {
        attack.currentPosition.x += attack.velocityVector.x * deltaTime;
        attack.currentPosition.y += attack.velocityVector.y * deltaTime;
      }
    }

    for (const id of toRemove) {
      this.attacks.delete(id);
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
