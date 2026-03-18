import type { RenderingService } from './interfaces/renderingService';
import type { EntityManager } from './interfaces/entityManager';
import type { ViewportManager } from './interfaces/viewportManager';
import type { StateManager } from './interfaces/stateManager';
import type { AttackController } from './interfaces/attackController';
import type { AnimationController } from './interfaces/animationController';
import type { Time } from './interfaces/time';
import type { Entity } from './entity';
import type { AttackType } from './messageInterfaces';
import { AttackTypeValue } from './messageInterfaces';
import { TAU } from './mathUtils';

export class Renderer implements RenderingService {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly entityManager: EntityManager;
  private readonly viewportManager: ViewportManager;
  private readonly gameStateManager: StateManager;
  private readonly attackController: AttackController;
  private readonly animationController: AnimationController;
  private readonly time: Time;

  private readonly BORDER_WIDTH = 2;
  private readonly HEALTH_BAR_HEIGHT = 16;
  private readonly HEALTH_BAR_OFFSET_Y = 20;
  private readonly HEALTH_BAR_BORDER_SIZE = 3;

  private readonly MELEE_RADIUS = 30;
  private readonly PROJECTILE_RADIUS = 10;
  private readonly SPECIAL_RADIUS = 50;

  private readonly COLOR_BORDER = '#ffffff';
  private readonly COLOR_HEALTH_BG = '#ff0000';
  private readonly COLOR_HEALTH_FG = '#00ff00';
  private readonly COLOR_MELEE = '#ffff00';
  private readonly COLOR_PROJECTILE = '#00ffff';
  private readonly COLOR_SPECIAL = '#ff00ff';
  private readonly COLOR_UI_TEXT = '#ffffff';
  private readonly COLOR_OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';

  constructor(
    ctx: CanvasRenderingContext2D,
    entityManager: EntityManager,
    viewportManager: ViewportManager,
    gameStateManager: StateManager,
    attackController: AttackController,
    animationController: AnimationController,
    time: Time,
  ) {
    this.ctx = ctx;
    this.entityManager = entityManager;
    this.viewportManager = viewportManager;
    this.gameStateManager = gameStateManager;
    this.attackController = attackController;
    this.animationController = animationController;
    this.time = time;
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.viewportManager.displayWidth, this.viewportManager.displayHeight);
    this.drawBorder();
    for (const entity of this.entityManager.getEntities()) {
      this.drawEntity(entity);
    }
    this.drawAttacks();
    this.drawUI();
  }

  private drawBorder(): void {
    this.ctx.strokeStyle = this.COLOR_BORDER;
    this.ctx.lineWidth = this.BORDER_WIDTH;
    this.ctx.strokeRect(
      this.viewportManager.viewportX - this.BORDER_WIDTH / 2,
      this.viewportManager.viewportY - this.BORDER_WIDTH / 2,
      this.viewportManager.viewportWidth + this.BORDER_WIDTH,
      this.viewportManager.viewportHeight + this.BORDER_WIDTH,
    );
  }

  private drawEntity(entity: Entity, parentCenterX = 0, parentCenterY = 0, offsetAngle = 0): void {
    entity = this.animationController.getAnimatedEntity(entity);
    const canvasScale = this.viewportManager.gameToCanvasSize(entity.spriteData.scaleFactor);
    const drawWidth = Math.round(entity.image.width * canvasScale);
    const drawHeight = Math.round(entity.image.height * canvasScale);

    const cos = Math.cos(offsetAngle);
    const sin = Math.sin(offsetAngle);
    const rotatedX = entity.position.x * cos - entity.position.y * sin;
    const rotatedY = entity.position.x * sin + entity.position.y * cos;

    const worldCenterX = parentCenterX + rotatedX;
    const worldCenterY = parentCenterY + rotatedY;

    const canvasX = Math.round(this.viewportManager.gameToCanvasX(worldCenterX));
    const canvasY = Math.round(this.viewportManager.gameToCanvasY(worldCenterY));
    const worldAngle = offsetAngle + entity.position.angle;

    this.drawImageToCanvas(entity.image, canvasX, canvasY, canvasScale, worldAngle);
    this.drawEntityHealthBar(entity, canvasX - drawWidth / 2, canvasY - drawHeight / 2);

    for (const subEntity of entity.subEntities) {
      this.drawEntity(subEntity, worldCenterX, worldCenterY, worldAngle);
    }
  }
  private drawImageToCanvas(image: ImageBitmap, centerX: number, centerY: number, scale: number, angle: number): void {
    const drawWidth = Math.round(image.width * scale);
    const drawHeight = Math.round(image.height * scale);

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(angle);
    this.ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    this.ctx.restore();
  }

  private drawEntityHealthBar(entity: Entity, canvasX: number, canvasY: number): void {
    const playerId = entity.id;
    if (!playerId) return;
    if (!playerId.startsWith('player_')) return;

    const player = this.gameStateManager.getPlayer(playerId);
    if (!player) return;

    const health = player.health;
    const maxHealth = player.maxHealth;
    const scale = this.viewportManager.scale;
    this.drawHealthBar(canvasX, canvasY - this.HEALTH_BAR_OFFSET_Y * scale, entity.width * scale, health, maxHealth);
  }

  private drawHealthBar(x: number, y: number, width: number, health: number, maxHealth: number): void {
    //TOOD check if health bar is not outside canvas/viewport
    const healthPercent = Math.max(0, Math.min(1, health / maxHealth));
    const scaledHeight = this.HEALTH_BAR_HEIGHT * this.viewportManager.scale;
    const scaledBorderSize = this.HEALTH_BAR_BORDER_SIZE * this.viewportManager.scale;
    const twiceScaledBorderSize = 2 * scaledBorderSize;
    // Border
    this.ctx.fillStyle = this.COLOR_BORDER;
    this.ctx.fillRect(x, y, width, scaledHeight);

    // Missing health as background
    this.ctx.fillStyle = this.COLOR_HEALTH_BG;
    this.ctx.fillRect(
      x + scaledBorderSize,
      y + scaledBorderSize,
      width - twiceScaledBorderSize,
      scaledHeight - twiceScaledBorderSize,
    );

    // Current health
    this.ctx.fillStyle = this.COLOR_HEALTH_FG;
    this.ctx.fillRect(
      x + scaledBorderSize,
      y + scaledBorderSize,
      width * healthPercent - twiceScaledBorderSize,
      scaledHeight - twiceScaledBorderSize,
    );
  }

  private drawAttacks(): void {
    const attacks = this.attackController.getAttacks();
    const scale = this.viewportManager.scale;
    for (const attack of attacks) {
      const canvasX = Math.round(this.viewportManager.gameToCanvasX(attack.currentPosition.x));
      const canvasY = Math.round(this.viewportManager.gameToCanvasY(attack.currentPosition.y));

      switch (attack.type) {
        case AttackTypeValue.Melee:
          this.drawMeleeAttack(canvasX, canvasY, scale);
          break;
        case AttackTypeValue.Projectile:
          this.drawProjectileAttack(canvasX, canvasY, scale);
          break;
        case AttackTypeValue.Special:
          this.drawSpecialAttack(canvasX, canvasY, scale);
          break;
      }
    }
  }

  private drawMeleeAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.strokeStyle = this.COLOR_MELEE;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.MELEE_RADIUS * scaleX, 0, TAU);
    this.ctx.stroke();
  }

  private drawProjectileAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.fillStyle = this.COLOR_PROJECTILE;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.PROJECTILE_RADIUS * scaleX, 0, TAU);
    this.ctx.fill();
  }

  private drawSpecialAttack(canvasX: number, canvasY: number, scaleX: number): void {
    this.ctx.strokeStyle = this.COLOR_SPECIAL;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.SPECIAL_RADIUS * scaleX, 0, TAU);
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
    const displayWidth = this.viewportManager.displayWidth;
    const displayHeight = this.viewportManager.displayHeight;

    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Waiting for players...', displayWidth / 2, displayHeight / 2);
  }

  private drawEndGameOverlay(): void {
    const displayWidth = this.viewportManager.displayWidth;
    const displayHeight = this.viewportManager.displayHeight;

    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    const winnerId = this.gameStateManager.getWinnerId();
    const message = winnerId === this.entityManager.getLocalPlayerEntity().id ? 'You Win!' : 'You Lose!';
    this.ctx.fillText(message, displayWidth / 2, displayHeight / 2);
  }

  private drawCooldownIndicators(): void {
    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    let y = 30;

    y = this.drawCooldownLine('Melee (Space)', AttackTypeValue.Melee, y);
    y = this.drawCooldownLine('Projectile (E)', AttackTypeValue.Projectile, y);
    y = this.drawCooldownLine('Special (Q)', AttackTypeValue.Special, y);
    this.ctx.fillText(`FPS: ${~~(1 / this.time.averageFrameTime)}`, 10, y);
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
