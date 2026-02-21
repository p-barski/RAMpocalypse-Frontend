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
import { AudioController } from './interfaces/audioController';

export class Game implements CallbacksHandler {
  public readonly communicationService: CommunicationService;
  public readonly abortSignal: AbortSignal;
  public readonly entityManager: EntityManager;
  public readonly gameStateManager: StateManager;
  public readonly inputHandler: InputHandler;
  public readonly viewportManager: ViewportManager;
  public readonly movementController: MovementController;
  public readonly attackController: AttackController;
  public readonly renderingService: RenderingService;
  public readonly audioController: AudioController;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;

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
    audioController: AudioController,
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
    this.audioController = audioController;
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
    this.audioController.cleanup();

    this.communicationService.disconnect().catch((error) => {
      console.warn('Game: Error during disconnect (ignored)', error);
    });
  }

  async connect(): Promise<void> {
    try {
      const playerId = await this.communicationService.connect(this);
      this.entityManager.updateLocalPlayerId(playerId);
    } catch (error) {
      if (this.abortSignal.aborted) return;
      throw error;
    }
    this.inputHandler.setAttackCallback(this.handleAttackInput);
    this.inputHandler.setup();
  }

  async requestMatchmaking(): Promise<void> {
    // TODO check if already playing
    this.gameStateManager.setGameState('waiting');
    this.gameStateManager.setWinnerId('');
    await this.communicationService.requestMatchmaking();
  }

  async leaveGame(): Promise<void> {
    await this.communicationService.leaveGame();
    this.entityManager.clearRemoteEntities();
    this.gameStateManager.reset();
  }

  onLobbyStart = async (lobbyId: string, players: Player[]): Promise<void> => {
    if (this.abortSignal.aborted) return;
    await this.delay();
    console.log('Lobby started:', { lobbyId, players });
    const playerId = this.entityManager.getLocalPlayerEntity().id;
    if (!playerId) {
      console.error('Current player ID not available');
      return;
    }

    const currentPlayer = players.find((p) => p.id === playerId);
    if (!currentPlayer) {
      console.error(
        'Current player not found in lobby:',
        playerId,
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
      if (player.id !== playerId) {
        await this.entityManager.createRemotePlayer(player.id, player.position, player.spriteData, player.subEntities);
      }
    }
  };

  onOtherPlayerPositionUpdated = async (playerId: string, position: Position): Promise<void> => {
    await this.delay();
    this.entityManager.updateEntityPosition(playerId, position);
  };

  onPlayerLeftLobby = async (playerId: string): Promise<void> => {
    await this.delay();
    this.entityManager.removeRemotePlayer(playerId);
    this.gameStateManager.removePlayer(playerId);
    if (this.gameStateManager.getAllPlayers().size === 1) {
      this.entityManager.clearRemoteEntities();
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

      if (type === AttackType.Projectile) {
        attackData.speed = speed;
      }
      this.attackController.addAttack(attackData);
      this.audioController.playShortRunningSound('attack_swing.mp3');
    } catch (error) {
      console.error('Error creating attack:', error);
    }
  };

  onPlayerDamaged = async (playerId: string, damage: number, newHealth: number): Promise<void> => {
    await this.delay();
    this.audioController.playShortRunningSound('attack_damage.mp3', 0.4);
    this.gameStateManager.updatePlayerHealth(playerId, newHealth);
    console.log('Player damaged:', { playerId, damage, newHealth });
  };

  onPlayerDied = async (playerId: string): Promise<void> => {
    await this.delay();
    this.audioController.playShortRunningSound('attack_damage.mp3', 0.4);
    this.audioController.playShortRunningSound('player_died.mp3');
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
    this.entityManager.clearRemoteEntities();
    this.gameStateManager.reset();
    this.gameStateManager.setGameState('ended');
    this.gameStateManager.setWinnerId(winnerId);
    console.log('Game ended, winner:', winnerId);
  };

  private handleAttackInput = (attackType: AttackInputType): void => {
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
    this.attackController.update(deltaTime);
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
