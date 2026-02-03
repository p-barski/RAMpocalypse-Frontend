import { MovementController } from './interfaces/movementController';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler } from './interfaces/inputHandler';
import { CommunicationService } from './communicatonService';
import { Position } from './messageInterfaces';

/**
 * MovementController - Handles player movement, boundary checking, and position updates.
 *
 * Responsibilities:
 * - Processing WASD/arrow key inputs for player movement
 * - Keeping the player within game world boundaries
 * - Throttling position updates to the server
 * - Communicating position changes via CommunicationService
 */
export class PlayerMovementController implements MovementController {
  // Game world dimensions (should match server)
  private readonly GAME_WIDTH = 1920;
  private readonly GAME_HEIGHT = 1080;
  private readonly POSITION_UPDATE_INTERVAL = 20; // ms

  private readonly entityManager: EntityManager;
  private readonly gameStateManager: StateManager;
  private readonly inputHandler: InputHandler;
  private readonly communicationService: CommunicationService;

  private speed = 5;
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

  /**
   * Updates the player's position based on input and sends position updates to the server.
   * Should be called once per frame.
   * @param _deltaTime Time elapsed since the last frame (currently unused, kept for interface compliance)
   */
  update(_deltaTime: number): void {
    // Only process movement when the game is playing
    if (!this.gameStateManager.isPlaying()) return;

    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;

    const now = Date.now();

    // Calculate new position based on input
    let newX = localPlayer.position.x;
    let newY = localPlayer.position.y;

    if (this.inputHandler.isUpPressed()) {
      newY -= this.speed;
    }
    if (this.inputHandler.isDownPressed()) {
      newY += this.speed;
    }
    if (this.inputHandler.isLeftPressed()) {
      newX -= this.speed;
    }
    if (this.inputHandler.isRightPressed()) {
      newX += this.speed;
    }

    // Apply boundary constraints to keep entity within game world
    newX = this.clampToBoundary(newX, localPlayer.width, this.GAME_WIDTH);
    newY = this.clampToBoundary(newY, localPlayer.height, this.GAME_HEIGHT);

    // Angle from player to mouse (radians)
    const mouseX = this.inputHandler.getMouseX();
    const mouseY = this.inputHandler.getMouseY();
    const angle = Math.atan2(mouseX - newX - localPlayer.width / 2, -(mouseY - newY - localPlayer.height / 2));

    const position: Position = { x: newX, y: newY, angle };

    // Update entity position (including rotation)
    this.entityManager.updateLocalPlayerPosition(position);

    // Send position update to server (throttled)
    const positionChanged =
      newX !== this.lastPosition.x || newY !== this.lastPosition.y || angle !== this.lastPosition.angle;
    if (now - this.lastPositionUpdateTime >= this.POSITION_UPDATE_INTERVAL && positionChanged) {
      this.sendPositionUpdate(position);
      this.lastPosition = position;
      this.lastPositionUpdateTime = now;
    }
  }

  /**
   * Sends a position update to the server.
   * @param position The position to send
   */
  async sendPositionUpdate(position: Position): Promise<void> {
    if (this.communicationService.isConnected()) {
      await this.communicationService.updatePlayerPosition(position);
    }
  }

  /**
   * Gets the current movement speed.
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Sets the movement speed.
   * @param speed The new speed value
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * Handles server position corrections by updating tracking state.
   * Should be called when the server sends a position correction.
   * @param x The corrected X position
   * @param y The corrected Y position
   */
  onPositionCorrected(position: Position): void {
    // Update last known position to match server-corrected position
    // This prevents sending incorrect positions after a correction
    this.lastPosition = position;
  }

  /**
   * Resets the position tracking state.
   * Useful when starting a new game or lobby.
   */
  resetPositionTracking(): void {
    this.lastPosition = { x: -1, y: -1, angle: 0 };
    this.lastPositionUpdateTime = 0;
  }

  /**
   * Clamps a position coordinate to stay within game world boundaries.
   * @param position The position coordinate to clamp
   * @param entitySize The size of the entity (width or height)
   * @param maxBoundary The maximum boundary (GAME_WIDTH or GAME_HEIGHT)
   * @returns The clamped position
   */
  private clampToBoundary(position: number, entitySize: number, maxBoundary: number): number {
    return Math.max(0, Math.min(position, maxBoundary - entitySize));
  }
}
