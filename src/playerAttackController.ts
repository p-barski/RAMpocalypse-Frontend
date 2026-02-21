import { AttackController, AttackEntity, Projectile } from './interfaces/attackController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { AttackType, Position } from './messageInterfaces';

export class PlayerAttackController implements AttackController {
  private readonly MELEE_COOLDOWN = 50;
  private readonly PROJECTILE_COOLDOWN = 100;
  private readonly SPECIAL_COOLDOWN = 300;
  private readonly entityManager: EntityManager;
  private readonly communicationService: CommunicationService;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;

  private readonly attackCooldowns: Map<AttackType, number> = new Map([
    [AttackType.Melee, 0],
    [AttackType.Projectile, 0],
    [AttackType.Special, 0],
  ]);

  private attacks: Map<string, AttackEntity> = new Map();
  private nextAttackId = 0;

  constructor(
    entityManager: EntityManager,
    communicationService: CommunicationService,
    gameStateManager: StateManager,
    inputHandler: InputHandler,
  ) {
    this.entityManager = entityManager;
    this.communicationService = communicationService;
    this.gameStateManager = gameStateManager;
    this.inputHandler = inputHandler;
  }

  performMeleeAttack(): void {
    if (!this.canPerformAttack(AttackType.Melee)) return;
    const direction = this.calculateAttackDirection();
    console.log(`Performing melee attack in direction: ${direction.x}, ${direction.y}`);

    this.setCooldown(AttackType.Melee);
    this.communicationService.performMeleeAttack(direction);
  }

  performProjectileAttack(): void {
    if (!this.canPerformAttack(AttackType.Projectile)) return;
    const direction = this.calculateAttackDirection();

    this.setCooldown(AttackType.Projectile);
    this.communicationService.performProjectileAttack(direction);
  }

  performSpecialAttack(): void {
    if (!this.canPerformAttack(AttackType.Special)) return;

    const localPlayer = this.entityManager.getLocalPlayerEntity();

    this.setCooldown(AttackType.Special);
    this.communicationService.performSpecialAttack(localPlayer.position);
  }

  getCooldown(attackType: AttackType): number {
    switch (attackType) {
      case AttackType.Melee:
        return this.MELEE_COOLDOWN;
      case AttackType.Projectile:
        return this.PROJECTILE_COOLDOWN;
      case AttackType.Special:
        return this.SPECIAL_COOLDOWN;
      default:
        return 0;
    }
  }

  getCooldownRemaining(attackType: AttackType): number {
    const cooldownEnd = this.attackCooldowns.get(attackType) || 0;
    const now = Date.now();
    return Math.max(0, cooldownEnd - now);
  }

  canPerformAttack(attackType: AttackType): boolean {
    if (!this.gameStateManager.isPlaying()) return false;
    if (!this.communicationService.isConnected()) return false;

    const cooldownEnd = this.attackCooldowns.get(attackType) || 0;
    return Date.now() >= cooldownEnd;
  }

  addAttack(attack: Omit<AttackEntity, 'id' | 'createdAt'>): string {
    const id = `attack_${this.nextAttackId++}`;
    const attackEntity: AttackEntity = {
      ...attack,
      id,
      createdAt: Date.now(),
    };
    this.attacks.set(id, attackEntity);
    return id;
  }

  getAttacks(): AttackEntity[] {
    return Array.from(this.attacks.values());
  }

  update(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, attack] of Array.from(this.attacks.entries())) {
      const age = now - attack.createdAt;
      if (age >= attack.lifetime) {
        toRemove.push(id);
      } else if (attack.type === AttackType.Projectile) {
        // Update projectile position
        const projectile = attack as Projectile;
        if (projectile.speed && projectile.speed > 0) {
          attack.currentPosition.x += projectile.direction.x * projectile.speed * (deltaTime / 1000);
          attack.currentPosition.y += projectile.direction.y * projectile.speed * (deltaTime / 1000);
        }
      }
    }

    for (const id of toRemove) {
      this.attacks.delete(id);
    }
  }

  removeAttack(id: string): void {
    this.attacks.delete(id);
  }

  clear(): void {
    this.attacks.clear();
  }

  private setCooldown(attackType: AttackType): void {
    const cooldownDuration = this.getCooldown(attackType);
    this.attackCooldowns.set(attackType, Date.now() + cooldownDuration);
  }

  private calculateAttackDirection(): Position {
    const localPlayer = this.entityManager.getLocalPlayerEntity();
    const mouseX = this.inputHandler.getMouseX();
    const mouseY = this.inputHandler.getMouseY();

    const directionX = mouseX - localPlayer.position.x;
    const directionY = mouseY - localPlayer.position.y;
    const length = Math.sqrt(directionX * directionX + directionY * directionY);

    // Default to up direction if mouse is exactly on player
    if (length === 0) {
      return { x: 0, y: -1, angle: 0 };
    }

    return {
      x: directionX / length,
      y: directionY / length,
      angle: 0,
    };
  }
}
