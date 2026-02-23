import { MovementController } from './interfaces/movementController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { Position } from './messageInterfaces';

export class PlayerMovementController implements MovementController {
  private readonly GAME_WIDTH = 1920;
  private readonly GAME_HEIGHT = 1080;
  private readonly SPEED = 500;
  private readonly POSITION_UPDATE_INTERVAL_MS = 20;
  private readonly DISTANCE_SQRT_LOOKUP = [1, 1, 1.41421356];
  private readonly entityManager: EntityManager;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;
  private readonly communicationService: CommunicationService;

  private lastPosition: Position = { x: -1, y: -1, angle: 0 };
  private lastPositionUpdateTime = 0;

  constructor(
    entityManager: EntityManager,
    gameStateManager: StateManager,
    inputHandler: InputHandler,
    communicationService: CommunicationService,
  ) {
    this.entityManager = entityManager;
    this.gameStateManager = gameStateManager;
    this.inputHandler = inputHandler;
    this.communicationService = communicationService;
  }

  update(deltaTime: number, currentFrameTime: number): void {
    if (!this.gameStateManager.isPlaying()) return;

    const localPlayer = this.entityManager.getLocalPlayerEntity();
    const speedDiff = this.SPEED * deltaTime;

    const dx = +this.inputHandler.isRightPressed() - +this.inputHandler.isLeftPressed();
    const dy = +this.inputHandler.isDownPressed() - +this.inputHandler.isUpPressed();
    const distanceSquared = dx * dx + dy * dy;
    const distance = this.DISTANCE_SQRT_LOOKUP[distanceSquared];
    let newX = localPlayer.position.x + (dx / distance) * speedDiff;
    let newY = localPlayer.position.y + (dy / distance) * speedDiff;
    newX = this.clampToBoundary(newX, localPlayer.width, this.GAME_WIDTH);
    newY = this.clampToBoundary(newY, localPlayer.height, this.GAME_HEIGHT);

    const mouseX = this.inputHandler.getMouseX();
    const mouseY = this.inputHandler.getMouseY();
    const angle = Math.atan2(mouseX - newX - localPlayer.width / 2, -(mouseY - newY - localPlayer.height / 2));

    const position: Position = { x: newX, y: newY, angle };
    this.entityManager.updateLocalPlayerPosition(position);

    const positionChanged =
      newX !== this.lastPosition.x || newY !== this.lastPosition.y || angle !== this.lastPosition.angle;
    if (currentFrameTime - this.lastPositionUpdateTime >= this.POSITION_UPDATE_INTERVAL_MS && positionChanged) {
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
    return Math.max(0, Math.min(position, maxBoundary - entitySize));
  }
}
