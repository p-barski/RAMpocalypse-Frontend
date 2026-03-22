import type { Player, Position, AttackEntity, AttackType } from './interfaces/messageInterfaces';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import type { CallbacksHandler } from './interfaces/callbacksHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { EntityManager } from './interfaces/entityManager';
import type { StateManager } from './interfaces/stateManager';
import type { InputHandler } from './interfaces/inputHandler';
import type { ViewportManager } from './interfaces/viewportManager';
import type { MovementController } from './interfaces/movementController';
import type { AttackController } from './interfaces/attackController';
import type { RenderingService } from './interfaces/renderingService';
import type { AudioController } from './interfaces/audioController';
import type { AnimationController } from './interfaces/animationController';
import type { GameTime } from './gameTime';
import { sleepAsync } from './utils';

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
  public readonly animationController: AnimationController;
  public readonly time: GameTime;
  private animationFrameId: number | null = null;

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
    animationController: AnimationController,
    time: GameTime,
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
    this.animationController = animationController;
    this.time = time;
    this.inputHandler.setup(this.handleAttackInput);
  }

  start(): void {
    if (this.animationFrameId === null) {
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

    this.communicationService.disconnect();
  }

  async connect(): Promise<void> {
    try {
      const playerId = await this.communicationService.connect();
      this.entityManager.updateLocalPlayerId(playerId);
    } catch (error) {
      if (this.abortSignal.aborted) return;
      throw error;
    }
  }

  async requestMatchmaking(): Promise<void> {
    if (this.gameStateManager.isPlaying()) {
      return;
    }
    this.gameStateManager.setGameState('waiting');
    this.gameStateManager.setWinnerId('');
    await this.communicationService.requestMatchmaking();
  }

  async leaveGame(): Promise<void> {
    await this.communicationService.leaveGame();
    this.clear();
  }

  onClose = async (error: Error | undefined): Promise<void> => {
    console.warn(`Lost connection with the server: ${error}`);
    this.clear();
    let retryCounter = 1;
    while (!this.abortSignal.aborted) {
      const reconnectTime = Math.min(250 * retryCounter, 8000);
      try {
        await this.connect();
        return;
      } catch (err) {
        console.warn(
          `Could not reconnect to the server. Current retry counter: ${retryCounter}. ` +
            `Will reconnect in ${reconnectTime}ms. ${err}`,
        );
      }
      await sleepAsync(reconnectTime);
      retryCounter++;
    }
  };

  onLobbyStart = async (lobbyId: string, players: Player[]): Promise<void> => {
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
      this.clear();
    }
  };

  onPositionCorrected = async (correctedPosition: Position): Promise<void> => {
    await this.delay();
    this.movementController.onPositionCorrected(correctedPosition);
    console.log('Position corrected by server:', correctedPosition);
  };

  onAttackPerformed = async (attackEntities: AttackEntity[]): Promise<void> => {
    await this.delay();
    for (const attackEntity of attackEntities) {
      this.attackController.addAttack(attackEntity);
      if (attackEntity.type === AttackTypeValue.Melee)
        this.animationController.createMeleeAttackAnimation(attackEntity.ownerId);
    }
    this.audioController.playShortRunningSound('attack_swing.mp3');
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
    this.clear();
    this.gameStateManager.setGameState('ended');
    this.gameStateManager.setWinnerId(winnerId);
    console.log('Game ended, winner:', winnerId);
  };

  private handleAttackInput = (attackType: AttackType): void => {
    if (!this.gameStateManager.isPlaying()) return;

    switch (attackType) {
      case AttackTypeValue.Melee:
        this.attackController.performMeleeAttack();
        break;
      case AttackTypeValue.Projectile:
        this.attackController.performProjectileAttack();
        break;
      case AttackTypeValue.Special:
        this.attackController.performSpecialAttack();
        break;
    }
  };

  private gameLoop(): void {
    this.time.update();
    if (this.gameStateManager.isPlaying()) {
      this.attackController.update();
      this.movementController.update(this.time.deltaTime, this.time.frameTimestamp);
    }
    this.renderingService.render();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private clear() {
    this.entityManager.clearRemoteEntities();
    this.attackController.clear();
    this.gameStateManager.reset();
  }

  private delay(): Promise<void> {
    return sleepAsync(100);
  }
}
