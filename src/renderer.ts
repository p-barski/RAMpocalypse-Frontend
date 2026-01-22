import { RenderingService } from './interfaces/renderingService';
import { EntityManager } from './interfaces/entityManager';
import { ViewportManager } from './interfaces/viewportManager';
import { StateManager } from './interfaces/stateManager';
import { AttackController } from './interfaces/attackController';
import { AttackManager, AttackEntity } from './attackSystem';
import { AttackType } from './messageInterfaces';
import { Entity } from './entity';
import { drawImageToCanvas } from './canvasUtils';

/**
 * Renderer - Handles all rendering operations for the game
 *
 * Responsible for:
 * - Clearing and preparing the canvas
 * - Drawing the game world border
 * - Rendering all entities (players) with health bars
 * - Rendering attacks (melee, projectile, special)
 * - Drawing UI overlays (game state messages, cooldown indicators)
 */
export class Renderer implements RenderingService {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly entityManager: EntityManager;
  private readonly viewportManager: ViewportManager;
  private readonly gameStateManager: StateManager;
  private readonly attackManager: AttackManager;
  private readonly attackController: AttackController;

  // Visual constants
  private readonly BORDER_WIDTH = 2;
  private readonly HEALTH_BAR_HEIGHT = 8;
  private readonly HEALTH_BAR_OFFSET_Y = 20;

  // Attack visual constants
  private readonly MELEE_RADIUS = 30;
  private readonly PROJECTILE_RADIUS = 10;
  private readonly SPECIAL_RADIUS = 50;

  // Colors
  private readonly COLOR_BORDER = '#ffffff';
  private readonly COLOR_HEALTH_BG = '#ff0000';
  private readonly COLOR_HEALTH_FG = '#00ff00';
  private readonly COLOR_MELEE = '#ffff00';
  private readonly COLOR_PROJECTILE = '#00ffff';
  private readonly COLOR_SPECIAL = '#ff00ff';
  private readonly COLOR_UI_TEXT = '#ffffff';
  private readonly COLOR_OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';

  // Local player tracking for UI
  private localPlayerId: string | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    entityManager: EntityManager,
    viewportManager: ViewportManager,
    gameStateManager: StateManager,
    attackManager: AttackManager,
    attackController: AttackController,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.entityManager = entityManager;
    this.viewportManager = viewportManager;
    this.gameStateManager = gameStateManager;
    this.attackManager = attackManager;
    this.attackController = attackController;
  }

  render(): void {
    // Ensure image smoothing is disabled for pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.clearCanvas();
    this.drawBorder();
    this.drawEntities();
    this.drawAttacks();
    this.drawUI();
  }

  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }

  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  private clearCanvas(): void {
    const displayWidth = this.viewportManager.getDisplayWidth();
    const displayHeight = this.viewportManager.getDisplayHeight();
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
  }

  private drawBorder(): void {
    const viewportX = this.viewportManager.getViewportX();
    const viewportY = this.viewportManager.getViewportY();
    const viewportWidth = this.viewportManager.getViewportWidth();
    const viewportHeight = this.viewportManager.getViewportHeight();

    this.ctx.strokeStyle = this.COLOR_BORDER;
    this.ctx.lineWidth = this.BORDER_WIDTH;
    this.ctx.strokeRect(
      viewportX - this.BORDER_WIDTH / 2,
      viewportY - this.BORDER_WIDTH / 2,
      viewportWidth + this.BORDER_WIDTH,
      viewportHeight + this.BORDER_WIDTH,
    );
  }

  private drawEntities(): void {
    const entities = this.entityManager.getEntities();
    const scaleX = this.viewportManager.getScaleX();

    for (const entity of entities) {
      this.drawEntity(entity, scaleX);
    }
  }

  private drawEntity(entity: Entity, scaleX: number): void {
    const canvasX = Math.round(this.viewportManager.gameToCanvasX(entity.position.x));
    const canvasY = Math.round(this.viewportManager.gameToCanvasY(entity.position.y));
    const canvasScale = this.viewportManager.gameToCanvasSize(entity.scale);

    // Draw the entity sprite
    drawImageToCanvas(this.ctx, entity.image, canvasX, canvasY, canvasScale);

    // Draw health bar for the entity
    this.drawEntityHealthBar(entity, canvasX, canvasY, scaleX);
  }

  private drawEntityHealthBar(entity: Entity, canvasX: number, canvasY: number, scaleX: number): void {
    const playerId = entity.playerId ?? this.localPlayerId;
    if (!playerId) return;

    const player = this.gameStateManager.getPlayer(playerId);
    if (!player) return;

    const health = player.health ?? 100;
    const maxHealth = player.maxHealth ?? 100;

    this.drawHealthBar(canvasX, canvasY - this.HEALTH_BAR_OFFSET_Y, entity.width * scaleX, health, maxHealth);
  }

  /**
   * Draws a health bar at the specified position
   */
  private drawHealthBar(x: number, y: number, width: number, health: number, maxHealth: number): void {
    const healthPercent = Math.max(0, Math.min(1, health / maxHealth));

    // Background (red - damage indicator)
    this.ctx.fillStyle = this.COLOR_HEALTH_BG;
    this.ctx.fillRect(x, y, width, this.HEALTH_BAR_HEIGHT);

    // Health (green - current health)
    this.ctx.fillStyle = this.COLOR_HEALTH_FG;
    this.ctx.fillRect(x, y, width * healthPercent, this.HEALTH_BAR_HEIGHT);

    // Border
    this.ctx.strokeStyle = this.COLOR_BORDER;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, this.HEALTH_BAR_HEIGHT);
  }

  private drawAttacks(): void {
    const attacks = this.attackManager.getAttacks();
    for (const attack of attacks) {
      this.drawAttack(attack);
    }
  }

  private drawAttack(attack: AttackEntity): void {
    const canvasX = Math.round(this.viewportManager.gameToCanvasX(attack.currentPosition.x));
    const canvasY = Math.round(this.viewportManager.gameToCanvasY(attack.currentPosition.y));
    const scaleX = this.viewportManager.getScaleX();

    switch (attack.type) {
      case AttackType.Melee:
        this.drawMeleeAttack(canvasX, canvasY, scaleX);
        break;
      case AttackType.Projectile:
        this.drawProjectileAttack(canvasX, canvasY, scaleX);
        break;
      case AttackType.Special:
        this.drawSpecialAttack(canvasX, canvasY, scaleX);
        break;
    }
  }

  private drawMeleeAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.strokeStyle = this.COLOR_MELEE;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.MELEE_RADIUS * scaleX, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Draws a projectile attack as a cyan filled circle
   */
  private drawProjectileAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.fillStyle = this.COLOR_PROJECTILE;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.PROJECTILE_RADIUS * scaleX, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draws a special attack as a magenta circle outline
   */
  private drawSpecialAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.strokeStyle = this.COLOR_SPECIAL;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.SPECIAL_RADIUS * scaleX, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawUI(): void {
    const gameState = this.gameStateManager.getGameState();

    if (gameState === 'waiting') {
      this.drawWaitingOverlay();
    } else if (gameState === 'ended') {
      this.drawEndGameOverlay();
    } else if (gameState === 'playing') {
      this.drawCooldownIndicators();
    }
  }

  private drawWaitingOverlay(): void {
    const displayWidth = this.viewportManager.getDisplayWidth();
    const displayHeight = this.viewportManager.getDisplayHeight();

    // Semi-transparent background
    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Message text
    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Waiting for players...', displayWidth / 2, displayHeight / 2);
  }

  private drawEndGameOverlay(): void {
    const displayWidth = this.viewportManager.getDisplayWidth();
    const displayHeight = this.viewportManager.getDisplayHeight();

    // Semi-transparent background
    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Win/Lose message
    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';

    const winnerId = this.gameStateManager.getWinnerId();
    const message = winnerId === this.localPlayerId ? 'You Win!' : 'You Lose!';
    this.ctx.fillText(message, displayWidth / 2, displayHeight / 2);
  }

  private drawCooldownIndicators(): void {
    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';

    let y = 30;

    // Melee cooldown
    y = this.drawCooldownLine('Melee (Space)', AttackType.Melee, y);

    // Projectile cooldown
    y = this.drawCooldownLine('Projectile (E)', AttackType.Projectile, y);

    // Special cooldown
    this.drawCooldownLine('Special (Q)', AttackType.Special, y);
  }

  private drawCooldownLine(label: string, attackType: AttackType, y: number): number {
    const cooldownRemaining = this.attackController.getCooldownRemaining(attackType);

    if (cooldownRemaining > 0) {
      const remainingSeconds = (cooldownRemaining / 1000).toFixed(1);
      this.ctx.fillText(`${label}: ${remainingSeconds}s`, 10, y);
    } else {
      this.ctx.fillText(`${label}: Ready`, 10, y);
    }

    return y + 25;
  }
}
