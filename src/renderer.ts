import type { RenderingService } from './interfaces/renderingService';
import type { EntityManager } from './interfaces/entityManager';
import type { ViewportManager } from './interfaces/viewportManager';
import type { StateManager } from './interfaces/stateManager';
import type { AttackController } from './interfaces/attackController';
import type { AnimationController, LegLifts } from './interfaces/animationController';
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

  // Googly eye geometry, as fractions of the sprite's drawn width/height
  private readonly EYE_RADIUS_RATIO = 0.09;
  private readonly EYE_SPACING_RATIO = 0.15;
  private readonly EYE_FORWARD_OFFSET_RATIO = 0.04;
  private readonly PUPIL_RADIUS_RATIO = 0.6;
  private readonly PUPIL_OFFSET_RATIO = 1.07;

  // Legs geometry, as fractions of the sprite's drawn height
  private readonly LEG_SPACING_RATIO = 0.1;
  private readonly LEG_LENGTH_RATIO = 0.3;
  private readonly LEG_THICKNESS_RATIO = 0.1;
  private readonly LEG_OUTLINE_RATIO = 0.02;
  private readonly BOOT_LENGTH_RATIO = 0.4;
  private readonly BOOT_HEIGHT_RATIO = 0.14;
  private readonly TOE_RADIUS_RATIO = 0.8;
  private readonly HEEL_RADIUS_RATIO = 0.2;

  // Arm geometry, shoulder as fractions of the body's drawn width/height, grip as fraction of weapon's height
  private readonly SHOULDER_X_RATIO = 0.5;
  private readonly SHOULDER_Y_RATIO = 0.1;
  private readonly GRIP_RATIO = 0.4;
  private readonly ELBOW_BEND_RATIO = 0.25;

  private readonly COLOR_BORDER = '#ffffff';
  private readonly COLOR_HEALTH_BG = '#ff0000';
  private readonly COLOR_HEALTH_FG = '#00ff00';
  private readonly COLOR_MELEE = '#ffff00';
  private readonly COLOR_PROJECTILE = '#00ffff';
  private readonly COLOR_SPECIAL = '#ff00ff';
  private readonly COLOR_UI_TEXT = '#ffffff';
  private readonly COLOR_OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';
  private readonly COLOR_BACKGROUND = '#282c34';

  private readonly COLOR_EYE_WHITE = '#ffffff';
  private readonly COLOR_EYE_PUPIL = '#000000';

  private readonly COLOR_LEG = '#000000';
  private readonly COLOR_LEG_OUTLINE = '#ffffff';

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
        if (this.isLocalPlayerDead()) {
          this.drawDeathOverlay();
        }
        break;
    }
  }

  private isLocalPlayerDead(): boolean {
    const localId = this.entityManager.getLocalPlayerEntity().id;
    const player = this.gameStateManager.getPlayer(localId);
    return player !== undefined && !player.isAlive;
  }

  // offsetAngle rotates both position and entity, facingAngle rotates only the entity around its own center
  private drawEntity(entity: Entity, parentCenterX = 0, parentCenterY = 0, offsetAngle = 0, facingAngle = 0): void {
    entity = this.animationController.getAnimatedEntity(entity, facingAngle);
    const canvasScale = this.viewportManager.gameToCanvasSize(entity.spriteData.scaleFactor);
    const drawWidth = Math.round(entity.image.width * canvasScale);
    const drawHeight = Math.round(entity.image.height * canvasScale);

    const worldAngle = offsetAngle + facingAngle + entity.position.angle;
    const center = this.getRotatedCenter(entity, offsetAngle, worldAngle);
    const worldCenterX = parentCenterX + center.x;
    const worldCenterY = parentCenterY + center.y;

    const canvasX = Math.round(this.viewportManager.gameToCanvasX(worldCenterX));
    const canvasY = Math.round(this.viewportManager.gameToCanvasY(worldCenterY));
    const isPlayer = this.isPlayerEntity(entity);

    // Player body stays upright, only weapon, pupils and boots follow the player's angle in place
    if (isPlayer) {
      this.drawLegs(entity, canvasX, canvasY, worldAngle, this.animationController.getWalkingLegLifts(entity));
    }
    this.drawImageToCanvas(entity.image, canvasX, canvasY, canvasScale, isPlayer ? offsetAngle : worldAngle);
    if (isPlayer) {
      this.drawGooglyEyes(canvasX, canvasY, drawWidth, drawHeight, worldAngle);
    }

    for (const subEntity of entity.subEntities) {
      if (isPlayer) {
        if (this.isWeaponEntity(subEntity)) {
          this.drawArm(entity, subEntity, canvasX, canvasY, offsetAngle, worldAngle - offsetAngle);
        }
        this.drawEntity(subEntity, worldCenterX, worldCenterY, offsetAngle, worldAngle - offsetAngle);
      } else {
        this.drawEntity(subEntity, worldCenterX, worldCenterY, worldAngle);
      }
    }
    this.drawEntityHealthBar(entity, canvasX - drawWidth / 2, canvasY - drawHeight / 2);
  }

  private isPlayerEntity(entity: Entity): boolean {
    return entity.id.startsWith('player_');
  }

  private isWeaponEntity(entity: Entity): boolean {
    return entity.id.startsWith('weapon_');
  }

  // Center of the sprite relative to its parent. Weapons rotate around their bottom center (the handle),
  // other entities around their own center. At worldAngle equal to offsetAngle both give the same result.
  private getRotatedCenter(entity: Entity, offsetAngle: number, worldAngle: number): { x: number; y: number } {
    const pivotY = this.isWeaponEntity(entity) ? entity.height / 2 : 0;
    const cos = Math.cos(offsetAngle);
    const sin = Math.sin(offsetAngle);
    const pivotX = entity.position.x * cos - (entity.position.y + pivotY) * sin;
    const pivotWorldY = entity.position.x * sin + (entity.position.y + pivotY) * cos;
    return {
      x: pivotX + pivotY * Math.sin(worldAngle),
      y: pivotWorldY - pivotY * Math.cos(worldAngle),
    };
  }

  private drawArm(
    player: Entity,
    weapon: Entity,
    centerX: number,
    centerY: number,
    offsetAngle: number,
    facingAngle: number,
  ): void {
    const scale = this.viewportManager.scale;
    const animatedWeapon = this.animationController.getAnimatedEntity(weapon, facingAngle);
    const cos = Math.cos(offsetAngle);
    const sin = Math.sin(offsetAngle);
    const shoulderX = (Math.sign(animatedWeapon.position.x) || 1) * player.width * this.SHOULDER_X_RATIO;
    const shoulderY = player.height * this.SHOULDER_Y_RATIO;
    const shoulder = { x: (shoulderX * cos - shoulderY * sin) * scale, y: (shoulderX * sin + shoulderY * cos) * scale };

    const weaponAngle = offsetAngle + facingAngle + animatedWeapon.position.angle;
    const weaponCenter = this.getRotatedCenter(animatedWeapon, offsetAngle, weaponAngle);
    const gripDistance = weapon.height * this.GRIP_RATIO;
    const gripX = (weaponCenter.x - Math.sin(weaponAngle) * gripDistance) * scale;
    const gripY = (weaponCenter.y + Math.cos(weaponAngle) * gripDistance) * scale;

    const midX = (shoulder.x + gripX) / 2;
    const midY = (shoulder.y + gripY) / 2;
    const dx = gripX - shoulder.x;
    const dy = gripY - shoulder.y;
    let normalX = -dy * this.ELBOW_BEND_RATIO;
    let normalY = dx * this.ELBOW_BEND_RATIO;
    if (normalX * midX + normalY * midY < 0) {
      normalX = -normalX;
      normalY = -normalY;
    }

    const height = player.height * scale;
    const thickness = height * this.LEG_THICKNESS_RATIO;
    const outline = height * this.LEG_OUTLINE_RATIO;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (const [style, width] of [
      [this.COLOR_LEG_OUTLINE, thickness + 2 * outline],
      [this.COLOR_LEG, thickness],
    ] as const) {
      this.ctx.strokeStyle = style;
      this.ctx.lineWidth = width;
      this.ctx.beginPath();
      this.ctx.moveTo(shoulder.x, shoulder.y);
      this.ctx.quadraticCurveTo(midX + normalX, midY + normalY, gripX, gripY);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawLegs(entity: Entity, centerX: number, centerY: number, angle: number, lifts: LegLifts): void {
    const scale = this.viewportManager.scale;
    const height = entity.height * scale;
    const hipOffsetX = entity.width * scale * this.LEG_SPACING_RATIO;
    const hipY = height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.drawLeg(-hipOffsetX, hipY - lifts.left * scale, height, angle);
    this.drawLeg(hipOffsetX, hipY - lifts.right * scale, height, angle);
    this.ctx.restore();
  }

  // Legs hang straight down, boots rotate around the ankle so the toe points where the player faces
  private drawLeg(hipX: number, hipY: number, height: number, angle: number): void {
    const legLength = height * this.LEG_LENGTH_RATIO;
    const legThickness = height * this.LEG_THICKNESS_RATIO;
    const outline = height * this.LEG_OUTLINE_RATIO;
    const bootLength = height * this.BOOT_LENGTH_RATIO;
    const bootHeight = height * this.BOOT_HEIGHT_RATIO;

    this.ctx.save();
    this.ctx.translate(hipX, hipY);

    const heelX = -legThickness;
    const bootX = Math.min(heelX, heelX + bootLength);
    const bootY = -bootHeight / 2;
    const toeRadius = bootHeight * this.TOE_RADIUS_RATIO;
    const heelRadius = bootHeight * this.HEEL_RADIUS_RATIO;
    const bootRadii = [heelRadius, toeRadius, heelRadius, heelRadius];

    const draw = (style: string, outline: number) => {
      this.ctx.strokeStyle = style;
      this.ctx.fillStyle = style;
      this.ctx.lineWidth = legThickness + 2 * outline;

      // leg
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, legLength);
      this.ctx.stroke();

      // boot
      this.ctx.save();
      this.ctx.translate(0, legLength);
      this.ctx.rotate(angle - Math.PI / 2);
      this.ctx.beginPath();
      this.ctx.roundRect(
        bootX - outline,
        bootY - outline,
        bootLength + 2 * outline,
        bootHeight + 2 * outline,
        bootRadii,
      );
      this.ctx.fill();
      this.ctx.restore();
    };
    draw(this.COLOR_LEG_OUTLINE, outline);
    draw(this.COLOR_LEG, 0);

    this.ctx.restore();
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

  private drawGooglyEyes(centerX: number, centerY: number, width: number, height: number, angle: number): void {
    const eyeRadius = width * this.EYE_RADIUS_RATIO;
    const pupilRadius = eyeRadius * this.PUPIL_RADIUS_RATIO;
    const pupilOffset = eyeRadius - pupilRadius * this.PUPIL_OFFSET_RATIO;
    const eyeX = width * this.EYE_SPACING_RATIO;
    const eyeY = -height * this.EYE_FORWARD_OFFSET_RATIO;
    const pupilX = Math.sin(angle) * pupilOffset;
    const pupilY = -Math.cos(angle) * pupilOffset;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    for (const x of [-eyeX, eyeX]) {
      this.ctx.fillStyle = this.COLOR_EYE_WHITE;
      this.ctx.beginPath();
      this.ctx.arc(x, eyeY, eyeRadius, 0, TAU);
      this.ctx.fill();

      this.ctx.fillStyle = this.COLOR_EYE_PUPIL;
      this.ctx.beginPath();
      this.ctx.arc(x + pupilX, eyeY + pupilY, pupilRadius, 0, TAU);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawEntityHealthBar(entity: Entity, canvasX: number, canvasY: number): void {
    if (!this.isPlayerEntity(entity)) return;
    const playerId = entity.id;

    const player = this.gameStateManager.getPlayer(playerId);
    if (!player) return;

    const health = player.health;
    const maxHealth = player.maxHealth;
    const scale = this.viewportManager.scale;
    const halfWidth = (entity.width / 2) * scale;
    const centeredX = canvasX + halfWidth / 2;
    this.drawHealthBar(centeredX, canvasY - this.HEALTH_BAR_OFFSET_Y * scale, halfWidth, health, maxHealth);
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

  private drawDeathOverlay(): void {
    const displayWidth = this.viewportManager.displayWidth;
    const displayHeight = this.viewportManager.displayHeight;

    this.ctx.fillStyle = this.COLOR_OVERLAY_BG;
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.textAlign = 'center';

    this.ctx.font = '48px Arial';
    this.ctx.fillText('You died!', displayWidth / 2, displayHeight / 2 - 20);

    const localId = this.entityManager.getLocalPlayerEntity().id;
    const deathTime = this.gameStateManager.getPlayerDeathTime(localId);
    const remainingMs =
      deathTime !== undefined
        ? Math.max(0, this.gameConfig.respawnCooldownMs - (this.time.frameTimestamp - deathTime))
        : 0;

    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Respawning in ${(remainingMs / 1000).toFixed(1)}s...`, displayWidth / 2, displayHeight / 2 + 30);
  }

  private drawCooldownIndicators(): void {
    this.ctx.fillStyle = this.COLOR_UI_TEXT;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    let y = 30;

    y = this.drawAttackCooldownLine('Melee', this.controls.meleeAttack, AttackTypeValue.Melee, y);
    y = this.drawAttackCooldownLine('Projectile', this.controls.projectileAttack, AttackTypeValue.Projectile, y);
    y = this.drawAttackCooldownLine('Special', this.controls.specialAttack, AttackTypeValue.Special, y);
    const armSwitchRemaining = this.attackController.getArmSwitchCdRemaining();
    y = this.drawCooldownLine(this.formatActionLabel('Switch arm', this.controls.switchArm), armSwitchRemaining, y);
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
