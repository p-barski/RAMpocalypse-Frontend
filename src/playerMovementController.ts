import type { MovementController } from './interfaces/movementController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Position, Vector2D } from './interfaces/messageInterfaces';
import type { GameConfig } from './interfaces/gameConfig';
import type { Time } from './interfaces/time';
import { clamp } from './mathUtils';

const DISTANCE_SQRT_LOOKUP: ReadonlyArray<number> = [1, 1, 1.41421356];

export class PlayerMovementController implements MovementController {
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;
  private readonly communicationService: CommunicationService;
  private readonly time: Time;

  private lastPosition: Position = { x: -1, y: -1, angle: 0 };
  private lastPositionUpdateTime = 0;
  private isDashing = false;
  private dashVelocity: Vector2D = { x: 0, y: 0 };
  private lastDashTime = 0;

  constructor(
    gameConfig: GameConfig,
    entityManager: EntityManager,
    gameStateManager: StateManager,
    inputHandler: InputHandler,
    communicationService: CommunicationService,
    time: Time,
  ) {
    this.gameConfig = gameConfig;
    this.entityManager = entityManager;
    this.gameStateManager = gameStateManager;
    this.inputHandler = inputHandler;
    this.communicationService = communicationService;
    this.time = time;
  }

  update(): void {
    const localPlayer = this.entityManager.getLocalPlayerEntity();
    let x = localPlayer.position.x;
    let y = localPlayer.position.y;
    let velocityVector: Vector2D;
    if (this.isDashing) {
      const currentDashDurationMs = this.time.frameTimestamp - this.lastDashTime;
      this.isDashing = currentDashDurationMs < this.gameConfig.dashDurationMs;
      const dashDurationOverflowSeconds = Math.max(currentDashDurationMs - this.gameConfig.dashDurationMs, 0) / 1000.0;
      const deltaTime = Math.max(this.time.deltaTime - dashDurationOverflowSeconds, 0);
      velocityVector = { x: this.dashVelocity.x * deltaTime, y: this.dashVelocity.y * deltaTime };
    } else {
      velocityVector = this.calculateVelocityVector(this.gameConfig.movementSpeed * this.time.deltaTime);
    }
    x = this.clampToBoundary(x + velocityVector.x, localPlayer.width, this.gameConfig.gameWidth);
    y = this.clampToBoundary(y + velocityVector.y, localPlayer.height, this.gameConfig.gameHeight);

    let angle = localPlayer.position.angle;
    if (this.inputHandler.isRotateLeftPressed()) {
      angle -= this.gameConfig.rotationSpeedRadPerSec * this.time.deltaTime;
    }
    if (this.inputHandler.isRotateRightPressed()) {
      angle += this.gameConfig.rotationSpeedRadPerSec * this.time.deltaTime;
    }
    const position: Position = { x, y, angle };
    this.entityManager.updateLocalPlayerPosition(position);

    const timeSinceLastUpdate = this.time.frameTimestamp - this.lastPositionUpdateTime;
    const positionChanged = x !== this.lastPosition.x || y !== this.lastPosition.y || angle !== this.lastPosition.angle;
    if (timeSinceLastUpdate >= this.gameConfig.positionUpdateIntervalMs && positionChanged) {
      this.communicationService.updatePlayerPosition(position);
      this.lastPosition = position;
      this.lastPositionUpdateTime = this.time.frameTimestamp;
    }
  }

  dash = async (): Promise<void> => {
    if (!this.gameStateManager.isPlaying()) return;
    if (this.time.frameTimestamp - this.lastDashTime < this.gameConfig.dashCooldownMs) return;

    const dashSpeed = this.gameConfig.movementSpeed * this.gameConfig.dashSpeedMultiplier;
    this.dashVelocity = this.calculateVelocityVector(dashSpeed);
    if (this.dashVelocity.x === 0 && this.dashVelocity.y === 0) return;

    this.lastDashTime = this.time.frameTimestamp;
    this.lastPositionUpdateTime = this.lastDashTime;
    this.isDashing = true;
    this.isDashing = await this.communicationService.dash(this.dashVelocity);
  };

  onPositionCorrected(position: Position): void {
    this.lastPosition = position;
    this.entityManager.updateLocalPlayerPosition(position);
  }

  resetPositionTracking(): void {
    this.lastPosition = { x: -1, y: -1, angle: 0 };
    this.lastPositionUpdateTime = 0;
  }

  private clampToBoundary(position: number, entitySize: number, maxBoundary: number): number {
    const halfSize = entitySize / 2;
    return clamp(position, halfSize, maxBoundary - halfSize);
  }

  private calculateVelocityVector(multiplier: number): Vector2D {
    const dx = +this.inputHandler.isRightPressed() - +this.inputHandler.isLeftPressed();
    const dy = +this.inputHandler.isDownPressed() - +this.inputHandler.isUpPressed();
    const distanceSquared = dx * dx + dy * dy;
    const distance = DISTANCE_SQRT_LOOKUP[distanceSquared];
    return { x: (dx / distance) * multiplier, y: (dy / distance) * multiplier };
  }
}
