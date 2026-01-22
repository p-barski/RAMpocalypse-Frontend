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
  private lastPositionX = -1;
  private lastPositionY = -1;
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

    // Update entity position
    this.entityManager.updateLocalPlayerPosition({ x: newX, y: newY } satisfies Position);

    // Send position update to server (throttled)
    if (now - this.lastPositionUpdateTime >= this.POSITION_UPDATE_INTERVAL) {
      if (newX !== this.lastPositionX || newY !== this.lastPositionY) {
        this.sendPositionUpdate({ x: newX, y: newY });
        this.lastPositionX = newX;
        this.lastPositionY = newY;
        this.lastPositionUpdateTime = now;
      }
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
    this.lastPositionX = position.x;
    this.lastPositionY = position.y;
  }

  /**
   * Resets the position tracking state.
   * Useful when starting a new game or lobby.
   */
  resetPositionTracking(): void {
    this.lastPositionX = -1;
    this.lastPositionY = -1;
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
