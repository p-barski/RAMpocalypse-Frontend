import { Player, AttackType, Position } from './messageInterfaces';
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
  }

  start(): void {
    if (this.animationFrameId === null) {
      this.lastFrameTime = Date.now();
      this.gameLoop();
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputHandler.cleanup();
    this.viewportManager.cleanup();

    this.communicationService.disconnect().catch((error) => {
      console.warn('Game: Error during disconnect (ignored)', error);
    });
  }

  async connect(): Promise<void> {
    try {
      this.playerId = await this.communicationService.connect(this);
      this.entityManager.updateLocalPlayerId(this.playerId);
    } catch (error) {
      if (this.abortSignal.aborted) return;
      throw error;
    }
    this.setupInput();
  }

  async requestMatchmaking(): Promise<void> {
    // TODO check if already playing
    this.gameStateManager.setGameState('waiting');
    this.gameStateManager.setWinnerId('');
    await this.communicationService.requestMatchmaking();
  }

  async leaveGame(): Promise<void> {
    await this.communicationService.leaveGame();
    this.entityManager.clearOtherPlayers();
    this.gameStateManager.reset();
  }

  onLobbyStart = async (lobbyId: string, players: Player[]): Promise<void> => {
    if (this.abortSignal.aborted) return;
    await this.delay();
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

    for (const player of players) {
      this.gameStateManager.addPlayer(player);
    }

    this.entityManager.updateLocalPlayerPosition(currentPlayer.position);
    await this.entityManager.updateLocalPlayerSprite(currentPlayer.spriteData);
    await this.entityManager.updateLocalPlayerSubEntities(currentPlayer.subEntities);

    this.movementController.resetPositionTracking();
    this.gameStateManager.setGameState('playing');

    for (const player of players) {
      if (player.id !== this.playerId) {
        await this.entityManager.createOtherPlayer(player.id, player.position, player.spriteData, player.subEntities);
      }
    }
  };

  onOtherPlayerPositionUpdated = async (playerId: string, position: Position): Promise<void> => {
    await this.delay();
    this.entityManager.updatePlayerPosition(playerId, position);
  };

  onPlayerLeftLobby = async (playerId: string): Promise<void> => {
    await this.delay();
    this.entityManager.removeOtherPlayer(playerId);
    this.gameStateManager.removePlayer(playerId);
    if (this.gameStateManager.getAllPlayers().size === 1) {
      this.entityManager.clearOtherPlayers();
      this.gameStateManager.reset();
    }
  };

  onPositionCorrected = async (correctedPosition: Position): Promise<void> => {
    await this.delay();
    this.entityManager.updateLocalPlayerPosition(correctedPosition);
    this.movementController.onPositionCorrected(correctedPosition);
    console.log('Position corrected by server:', correctedPosition);
  };

  onAttackPerformed = async (
    playerId: string,
    attackType: number,
    attackPosition: Position,
    attackDirection: Position,
  ): Promise<void> => {
    await this.delay();
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

      this.attackController.addAttack(attackData);
    } catch (error) {
      console.error('Error creating attack:', error);
    }
  };

  onPlayerDamaged = async (playerId: string, damage: number, newHealth: number): Promise<void> => {
    await this.delay();
    this.gameStateManager.updatePlayerHealth(playerId, newHealth);
    console.log('Player damaged:', { playerId, damage, newHealth });
  };

  onPlayerDied = async (playerId: string): Promise<void> => {
    await this.delay();
    this.gameStateManager.updatePlayerHealth(playerId, 0, false);
    this.entityManager.hidePlayer(playerId);
    console.log('Player died:', playerId);
  };

  onPlayerRespawned = async (playerId: string, position: Position): Promise<void> => {
    await this.delay();
    const player = this.gameStateManager.getPlayer(playerId);
    if (player) {
      this.gameStateManager.updatePlayerHealth(playerId, player.maxHealth, true);
    }
    this.entityManager.showPlayer(playerId, position);
    console.log('Player respawned:', { playerId, position });
  };

  onGameEnded = async (winnerId: string): Promise<void> => {
    await this.delay();
    this.entityManager.clearOtherPlayers();
    this.gameStateManager.reset();
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

    // Update attack controller
    this.attackController.update(deltaTime);

    // Update movement (handles input processing and server communication)
    this.movementController.update(deltaTime);
  }

  private gameLoop(): void {
    this.update();
    this.renderingService.render();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private async delay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
