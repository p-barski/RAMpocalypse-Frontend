import { Player, AttackType, Position } from './messageInterfaces';
import { AttackManager } from './attackSystem';
import { CallbacksHandler } from './callbacksHandler';
import { CommunicationService } from './communicatonService';
import { EntityManager } from './interfaces/entityManager';
import { StateManager } from './interfaces/stateManager';
import { InputHandler, AttackInputType } from './interfaces/inputHandler';
import { ViewportManager } from './interfaces/viewportManager';
import { MovementController } from './interfaces/movementController';
import { AttackController } from './interfaces/attackController';
import { RenderingService } from './interfaces/renderingService';

/**
 * Game class - Orchestrates all game services and handles server callbacks.
 *
 * This class is the central coordinator that:
 * - Wires together all the services via dependency injection
 * - Implements CallbacksHandler to receive server events
 * - Manages the game loop (update -> render cycle)
 * - Manages connection lifecycle
 */
export class Game implements CallbacksHandler {
  // Dependencies
  public readonly communicationService: CommunicationService;
  public readonly abortSignal: AbortSignal;
  public readonly entityManager: EntityManager;
  public readonly gameStateManager: StateManager;
  public readonly inputHandler: InputHandler;
  public readonly viewportManager: ViewportManager;
  public readonly movementController: MovementController;
  public readonly attackController: AttackController;
  public readonly renderingService: RenderingService;
  public readonly attackManager: AttackManager;

  // Game loop state
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;

  // Player ID (set after connection)
  private playerId: string | null = null;

  constructor(
    communicationService: CommunicationService,
    abortSignal: AbortSignal,
    entityManager: EntityManager,
    gameStateManager: StateManager,
    inputHandler: InputHandler,
    viewportManager: ViewportManager,
    movementController: MovementController,
    attackController: AttackController,
    renderingService: RenderingService,
    attackManager: AttackManager,
  ) {
    this.communicationService = communicationService;
    this.abortSignal = abortSignal;
    this.entityManager = entityManager;
    this.gameStateManager = gameStateManager;
    this.inputHandler = inputHandler;
    this.viewportManager = viewportManager;
    this.movementController = movementController;
    this.attackController = attackController;
    this.renderingService = renderingService;
    this.attackManager = attackManager;
  }

  /**
   * Starts the game loop
   */
  start(): void {
    if (this.animationFrameId === null) {
      this.lastFrameTime = Date.now();
      this.gameLoop();
    }
  }

  /**
   * Stops the game loop and disconnects from the server
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputHandler.cleanup();
    this.viewportManager.cleanup();

    // Disconnect from server
    this.communicationService.disconnect().catch((error) => {
      console.warn('Game: Error during disconnect (ignored)', error);
    });
  }

  /**
   * Connects to the game server
   */
  async connect(): Promise<void> {
    try {
      this.playerId = await this.communicationService.connect(this);
      this.entityManager.updateLocalPlayerId(this.playerId);
      this.renderingService.setLocalPlayerId(this.playerId);
    } catch (error) {
      if (this.abortSignal.aborted) return;
      throw error;
    }
    this.setupInput();
    // this.setupResize();
  }

  /**
   * Requests matchmaking from the server
   */
  async requestMatchmaking(): Promise<void> {
    if (this.communicationService.isConnected()) {
      await this.communicationService.requestMatchmaking();
    }
  }

  /**
   * Leaves the current game
   */
  async leaveGame(): Promise<void> {
    if (this.communicationService.isConnected()) {
      await this.communicationService.leaveGame();
    }
  }

  /**
   * Creates the local player entity.
   * Called from App.tsx after loading the initial sprite.
   */
  async addEntity(image: ImageBitmap, position: Position, scale: number, spriteVariant: number): Promise<void> {
    await this.entityManager.createLocalPlayer(position, scale, spriteVariant);
  }

  // ============================================
  // CallbacksHandler Implementation
  // ============================================

  onLobbyStart = async (lobbyId: string, players: Player[]): Promise<void> => {
    if (this.abortSignal.aborted) return;
    console.log('Lobby started:', { lobbyId, players });

    if (!this.playerId) {
      console.error('Current player ID not available');
      return;
    }

    const currentPlayer = players.find((p) => p.id === this.playerId);
    if (!currentPlayer) {
      console.error(
        'Current player not found in lobby:',
        this.playerId,
        'Available players:',
        players.map((p) => p.id),
      );
      return;
    }

    // Initialize health for all players in game state
    for (const player of players) {
      this.gameStateManager.addPlayer({
        id: player.id,
        position: player.position,
        spriteVariant: player.spriteVariant,
        health: player.health,
        maxHealth: player.maxHealth,
        isAlive: player.isAlive !== false,
      } satisfies Player);
    }

    // Update local player position and sprite
    const localPlayer = this.entityManager.getLocalPlayer();
    if (localPlayer) {
      this.entityManager.updateLocalPlayerPosition(currentPlayer.position);
      await this.entityManager.updateLocalPlayerSprite(currentPlayer.spriteVariant);
    }

    // Reset position tracking
    this.movementController.resetPositionTracking();

    // Start the game
    this.gameStateManager.setGameState('playing');

    // Create entities for other players
    for (const player of players) {
      if (player.id !== this.playerId) {
        const { wasCreated } = await this.entityManager.updateOrCreateOtherPlayer(
          player.id,
          player.position,
          8,
          player.spriteVariant,
        );
        console.log(wasCreated ? 'Created new entity for player:' : 'Updated existing entity for player:', player.id);
      }
    }
  };

  onOtherPlayerPositionUpdated = async (playerId: string, position: Position): Promise<void> => {
    const { wasCreated } = await this.entityManager.updateOrCreateOtherPlayer(playerId, position);
    if (wasCreated) {
      console.warn('Received position update for unknown player, created entity:', playerId);
    }
  };

  onPlayerLeftLobby = (playerId: string): void => {
    const removed = this.entityManager.removeOtherPlayer(playerId);
    if (removed) {
      console.log('Removed player from game:', playerId);
    }
    this.gameStateManager.removePlayer(playerId);
  };

  onPositionCorrected = (correctedPosition: Position): void => {
    this.entityManager.updateLocalPlayerPosition(correctedPosition);
    this.movementController.onPositionCorrected(correctedPosition);
    console.log('Position corrected by server:', correctedPosition);
  };

  onAttackPerformed = (
    playerId: string,
    attackType: number,
    attackPosition: Position,
    attackDirection: Position,
  ): void => {
    try {
      const type = attackType as AttackType;
      let lifetime = 500;
      let speed = 0;

      if (type === AttackType.Melee) {
        lifetime = 200;
      } else if (type === AttackType.Projectile) {
        lifetime = 3000;
        speed = 800;
      } else if (type === AttackType.Special) {
        lifetime = 1000;
      }

      const attackData: {
        type: AttackType;
        currentPosition: Position;
        direction: Position;
        ownerId: string;
        lifetime: number;
        speed?: number;
      } = {
        type,
        currentPosition: attackPosition,
        direction: attackDirection,
        ownerId: playerId,
        lifetime,
      };

      // Only add speed for projectiles
      if (type === AttackType.Projectile) {
        attackData.speed = speed;
      }

      this.attackManager.addAttack(attackData);
    } catch (error) {
      console.error('Error creating attack:', error);
    }
  };

  onPlayerDamaged = (playerId: string, damage: number, newHealth: number): void => {
    this.gameStateManager.updatePlayerHealth(playerId, newHealth);
    console.log('Player damaged:', { playerId, damage, newHealth });
  };

  onPlayerDied = (playerId: string): void => {
    this.gameStateManager.updatePlayerHealth(playerId, 0, false);
    this.entityManager.hidePlayer(playerId);
    console.log('Player died:', playerId);
  };

  onPlayerRespawned = (playerId: string, position: Position): void => {
    const player = this.gameStateManager.getPlayer(playerId);
    if (player) {
      this.gameStateManager.updatePlayerHealth(playerId, player.maxHealth, true);
    }
    this.entityManager.showPlayer(playerId, position);
    console.log('Player respawned:', { playerId, position });
  };

  onGameEnded = (winnerId: string, _players: Player[]): void => {
    this.gameStateManager.setGameState('ended');
    this.gameStateManager.setWinnerId(winnerId);
    console.log('Game ended, winner:', winnerId);
  };

  // ============================================
  // Private Methods
  // ============================================

  private setupInput(): void {
    // Setup input handler with attack callback
    this.inputHandler.setAttackCallback(this.handleAttackInput);
    this.inputHandler.setup();
  }

  // private setupResize(): void {
  //   window.addEventListener('resize', this.boundResize);
  //   this.viewportManager.resizeCanvas();
  // }

  // private handleResize(): void {
  //   this.viewportManager.resizeCanvas();
  // }

  private handleAttackInput = (attackType: AttackInputType): void => {
    // Only allow attacks when playing
    if (!this.gameStateManager.isPlaying()) return;

    switch (attackType) {
      case 'melee':
        this.attackController.performMeleeAttack();
        break;
      case 'projectile':
        this.attackController.performProjectileAttack();
        break;
      case 'special':
        this.attackController.performSpecialAttack();
        break;
    }
  };

  private update(): void {
    if (!this.gameStateManager.isPlaying()) return;

    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update attack manager
    this.attackManager.update(deltaTime);

    // Update movement (handles input processing and server communication)
    this.movementController.update(deltaTime);
  }

  private render(): void {
    this.renderingService.render();
  }

  private gameLoop(): void {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }
}
