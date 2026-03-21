import type { MovementController } from './interfaces/movementController';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Position } from './interfaces/messageInterfaces';
import type { GameConfig } from './interfaces/gameConfig';

const DISTANCE_SQRT_LOOKUP: ReadonlyArray<number> = [1, 1, 1.41421356];

export class PlayerMovementController implements MovementController {
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;
  private readonly communicationService: CommunicationService;

  private lastPosition: Position = { x: -1, y: -1, angle: 0 };
  private lastPositionUpdateTime = 0;

  constructor(
    gameConfig: GameConfig,
    entityManager: EntityManager,
    gameStateManager: StateManager,
    inputHandler: InputHandler,
    communicationService: CommunicationService,
  ) {
    this.gameConfig = gameConfig;
    this.entityManager = entityManager;
    this.gameStateManager = gameStateManager;
    this.inputHandler = inputHandler;
    this.communicationService = communicationService;
  }

  update(deltaTime: number, currentFrameTime: number): void {
    if (!this.gameStateManager.isPlaying()) return;

    const localPlayer = this.entityManager.getLocalPlayerEntity();
    const speedDiff = this.gameConfig.maxMovementSpeed * deltaTime;

    const dx = +this.inputHandler.isRightPressed() - +this.inputHandler.isLeftPressed();
    const dy = +this.inputHandler.isDownPressed() - +this.inputHandler.isUpPressed();
    const distanceSquared = dx * dx + dy * dy;
    const distance = DISTANCE_SQRT_LOOKUP[distanceSquared];
    let newX = localPlayer.position.x + (dx / distance) * speedDiff;
    let newY = localPlayer.position.y + (dy / distance) * speedDiff;
    newX = this.clampToBoundary(newX, localPlayer.width, this.gameConfig.gameWidth);
    newY = this.clampToBoundary(newY, localPlayer.height, this.gameConfig.gameHeight);

    const mouseX = this.inputHandler.mouseX;
    const mouseY = this.inputHandler.mouseY;
    const angle = Math.atan2(mouseX - newX, -(mouseY - newY));

    const position: Position = { x: newX, y: newY, angle };
    this.entityManager.updateLocalPlayerPosition(position);

    const positionChanged =
      newX !== this.lastPosition.x || newY !== this.lastPosition.y || angle !== this.lastPosition.angle;
    if (currentFrameTime - this.lastPositionUpdateTime >= this.gameConfig.positionUpdateIntervalMs && positionChanged) {
      this.communicationService.updatePlayerPosition(position);
      this.lastPosition = position;
      this.lastPositionUpdateTime = currentFrameTime;
    }
  }

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
    return Math.max(halfSize, Math.min(position, maxBoundary - halfSize));
  }
}
