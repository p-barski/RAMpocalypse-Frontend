import { AttackController } from './interfaces/attackController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { AttackType, Position } from './messageInterfaces';

export class PlayerAttackController implements AttackController {
  private readonly MELEE_COOLDOWN = 500;
  private readonly PROJECTILE_COOLDOWN = 1000;
  private readonly SPECIAL_COOLDOWN = 3000;

  private readonly attackCooldowns: Map<AttackType, number> = new Map([
    [AttackType.Melee, 0],
    [AttackType.Projectile, 0],
    [AttackType.Special, 0],
  ]);

  private readonly entityManager: EntityManager;
  private readonly communicationService: CommunicationService;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;

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

    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;

    const direction = this.calculateAttackDirection(localPlayer.position.x, localPlayer.position.y);

    this.setCooldown(AttackType.Melee);
    this.communicationService.performMeleeAttack(direction);
  }

  performProjectileAttack(): void {
    if (!this.canPerformAttack(AttackType.Projectile)) return;

    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;

    const direction = this.calculateAttackDirection(localPlayer.position.x, localPlayer.position.y);

    this.setCooldown(AttackType.Projectile);
    this.communicationService.performProjectileAttack(direction);
  }

  performSpecialAttack(): void {
    if (!this.canPerformAttack(AttackType.Special)) return;

    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;

    this.setCooldown(AttackType.Special);
    this.communicationService.performSpecialAttack({ x: localPlayer.position.x, y: localPlayer.position.y });
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

    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return false;

    const cooldownEnd = this.attackCooldowns.get(attackType) || 0;
    return Date.now() >= cooldownEnd;
  }

  private setCooldown(attackType: AttackType): void {
    const cooldownDuration = this.getCooldown(attackType);
    this.attackCooldowns.set(attackType, Date.now() + cooldownDuration);
  }

  private calculateAttackDirection(playerX: number, playerY: number): Position {
    const mouseX = this.inputHandler.getMouseX();
    const mouseY = this.inputHandler.getMouseY();

    const directionX = mouseX - playerX;
    const directionY = mouseY - playerY;
    const length = Math.sqrt(directionX * directionX + directionY * directionY);

    // Default to up direction if mouse is exactly on player
    if (length === 0) {
      return { x: 0, y: -1 };
    }

    return {
      x: directionX / length,
      y: directionY / length,
    };
  }
}
