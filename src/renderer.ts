import type { RenderingService } from './interfaces/renderingService';
import type { EntityManager } from './interfaces/entityManager';
import type { ViewportManager } from './interfaces/viewportManager';
import type { StateManager } from './interfaces/stateManager';
import type { AttackController } from './interfaces/attackController';
import type { AnimationController } from './interfaces/animationController';
import type { MovementController } from './interfaces/movementController';
import type { Time } from './interfaces/time';
import type { ControlBindings } from './gameSettings';
import { formatKeyLabel } from './utils';
import type { Entity } from './interfaces/entity';
import type { AttackType } from './interfaces/messageInterfaces';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import type { GameConfig } from './interfaces/gameConfig';
import { clamp, TAU } from './mathUtils';

export class Renderer implements RenderingService {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly viewportManager: ViewportManager;
  private readonly gameStateManager: StateManager;
  private readonly attackController: AttackController;
  private readonly movementController: MovementController;
  private readonly animationController: AnimationController;
  private readonly time: Time;
  private readonly controls: ControlBindings;

  private readonly HEALTH_BAR_HEIGHT = 16;
  private readonly HEALTH_BAR_OFFSET_Y = 20;
  private readonly HEALTH_BAR_BORDER_SIZE = 3;

  private readonly MELEE_RADIUS = 30;
  private readonly PROJECTILE_RADIUS = 10;

  private readonly COLOR_BORDER = '#ffffff';
  private readonly COLOR_HEALTH_BG = '#ff0000';
  private readonly COLOR_HEALTH_FG = '#00ff00';
  private readonly COLOR_MELEE = '#ffff00';
  private readonly COLOR_PROJECTILE = '#00ffff';
  private readonly COLOR_SPECIAL = '#ff00ff';
  private readonly COLOR_UI_TEXT = '#ffffff';
  private readonly COLOR_OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';
  private readonly COLOR_BACKGROUND = '#282c34';

  constructor(
    ctx: CanvasRenderingContext2D,
    gameConfig: GameConfig,
    entityManager: EntityManager,
    viewportManager: ViewportManager,
    gameStateManager: StateManager,
    attackController: AttackController,
    movementController: MovementController,
    animationController: AnimationController,
    time: Time,
    controls: ControlBindings,
  ) {
    this.ctx = ctx;
    this.entityManager = entityManager;
    this.viewportManager = viewportManager;
    this.gameStateManager = gameStateManager;
    this.attackController = attackController;
    this.movementController = movementController;
    this.animationController = animationController;
    this.time = time;
    this.gameConfig = gameConfig;
    this.controls = controls;
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.viewportManager.displayWidth, this.viewportManager.displayHeight);
    for (const entity of this.entityManager.getEntities()) {
      this.drawEntity(entity);
    }
    this.drawAttacks();

    // Clip sprites outside of playable area
    this.ctx.fillStyle = this.COLOR_BACKGROUND;
    const x = this.viewportManager.viewportX;
    const y = this.viewportManager.viewportY;
    const w = this.viewportManager.displayWidth;
    const h = this.viewportManager.displayHeight;
    this.ctx.fillRect(0, 0, w, y);
    this.ctx.fillRect(0, 0, x, h);
    this.ctx.fillRect(w - x, 0, x, h);
    this.ctx.fillRect(0, h - y, w, y);

    // UI
    switch (this.gameStateManager.getGameState()) {
      case 'matchmaking':
        this.drawCooldownIndicators();
        this.drawMatchmakingStatus();
        break;
      case 'lobbyReady':
        this.drawLobbyReadyOverlay();
        break;
      case 'ended':
        this.drawEndGameOverlay();
        break;
      default:
        this.drawCooldownIndicators();
        break;
    }
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
    if (!playerId.startsWith('player_')) return;

    const player = this.gameStateManager.getPlayer(playerId);
    if (!player) return;

    const health = player.health;
    const maxHealth = player.maxHealth;
    const scale = this.viewportManager.scale;
    this.drawHealthBar(canvasX, canvasY - this.HEALTH_BAR_OFFSET_Y * scale, entity.width * scale, health, maxHealth);
  }

  private drawHealthBar(x: number, y: number, width: number, health: number, maxHealth: number): void {
    const healthPercent = clamp(health / maxHealth, 0, 1);
    const scaledHeight = this.HEALTH_BAR_HEIGHT * this.viewportManager.scale;
    y = clamp(
      y,
      this.viewportManager.viewportY,
      this.viewportManager.displayHeight - this.viewportManager.viewportY - scaledHeight,
    );
    const scaledBorderSize = this.HEALTH_BAR_BORDER_SIZE * this.viewportManager.scale;
    const twiceScaledBorderSize = 2 * scaledBorderSize;

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
    this.ctx.arc(canvasX, canvasY, this.gameConfig.specialRange * scaleX, 0, TAU);
    this.ctx.stroke();
  }

  private drawMatchmakingStatus(): void {
    const displayWidth = this.viewportManager.displayWidth;
    const text = 'Waiting for players...';
    const font = '16px Arial';
    const padding = 12;
    const margin = 10;

    this.ctx.font = font;
    const textWidth = this.ctx.measureText(text).width;
    const panelWidth = textWidth + padding * 2;
    const panelHeight = 16 + padding * 2;
    const panelX = displayWidth - panelWidth - margin;
    const panelY = margin;

    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = font;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, panelX + padding, panelY + panelHeight / 2);
  }

  private drawLobbyReadyOverlay(): void {
    const displayWidth = this.viewportManager.displayWidth;
    const displayHeight = this.viewportManager.displayHeight;

    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Lobby is ready!', displayWidth / 2, displayHeight / 2);
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

    y = this.drawAttackCooldownLine('Melee', this.controls.meleeAttack, AttackTypeValue.Melee, y);
    y = this.drawAttackCooldownLine('Projectile', this.controls.projectileAttack, AttackTypeValue.Projectile, y);
    y = this.drawAttackCooldownLine('Special', this.controls.specialAttack, AttackTypeValue.Special, y);
    const dashCooldown = this.movementController.getDashCooldownRemaining();
    y = this.drawCooldownLine(this.formatActionLabel('Dash', this.controls.dash), dashCooldown, y);
    this.ctx.fillText(`FPS: ${~~(1 / this.time.averageFrameTime)}`, 10, y);
  }

  private formatActionLabel(name: string, keys: string[]): string {
    return `${name} (${formatKeyLabel(keys[0])})`;
  }

  private drawAttackCooldownLine(name: string, keys: string[], attackType: AttackType, y: number): number {
    const cooldown = this.attackController.getCooldownRemaining(attackType);
    return this.drawCooldownLine(this.formatActionLabel(name, keys), cooldown, y);
  }

  private drawCooldownLine(label: string, cooldownRemaining: number, y: number): number {
    if (cooldownRemaining > 0) {
      const remainingSeconds = (cooldownRemaining / 1000).toFixed(1);
      this.ctx.fillText(`${label}: ${remainingSeconds}s`, 10, y);
    } else {
      this.ctx.fillText(`${label}: Ready`, 10, y);
    }

    return y + 25;
  }
}
