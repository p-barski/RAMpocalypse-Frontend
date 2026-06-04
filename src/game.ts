import type {
  Player,
  Position,
  AttackEntity,
  AttackType,
  ChatMessageServer,
  ChatMessageType,
} from './interfaces/messageInterfaces';
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
import type { GameSession } from './communicationServiceWrapperForLocalGameplay';
import { sleepAsync } from './utils';

export class Game implements CallbacksHandler {
  public readonly communicationService: CommunicationService;
  public readonly gameSession: GameSession;
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
  private isExplicitlyStopped = false;
  private animationFrameId: number | null = null;

  constructor(
    communicationService: CommunicationService,
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
    gameSession: GameSession,
  ) {
    this.communicationService = communicationService;
    this.gameSession = gameSession;
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
    this.inputHandler.setup(this.handleAttackInput, this.movementController.dash);
  }

  start(): void {
    if (this.animationFrameId === null) {
      this.gameLoop();
    }
  }

  stop(): void {
    this.isExplicitlyStopped = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputHandler.cleanup();
    this.viewportManager.cleanup();
    this.audioController.cleanup();
    this.communicationService.disconnect();
  }

  enterLocalSandbox(): void {
    this.gameSession.isOnlineMatch = false;
    this.entityManager.clearRemoteEntities();
    this.attackController.clear();
    const localPlayer = this.entityManager.getLocalPlayerEntity();
    this.gameStateManager.reset();
    this.gameStateManager.addPlayer({
      id: localPlayer.id,
      position: localPlayer.position,
      spriteData: localPlayer.spriteData,
      subEntities: localPlayer.subEntities,
      health: 100,
      maxHealth: 100,
      isAlive: true,
    });
    this.gameStateManager.setWinnerId('');
    this.movementController.resetPositionTracking();
    this.gameStateManager.setGameState('playing');
  }

  async connect(): Promise<void> {
    const localPlayer = this.entityManager.getLocalPlayerEntity();
    const playerId = await this.communicationService.connect();
    this.gameStateManager.removePlayer(localPlayer.id);
    this.gameStateManager.addPlayer({
      id: playerId,
      position: localPlayer.position,
      spriteData: localPlayer.spriteData,
      subEntities: localPlayer.subEntities,
      health: 100,
      maxHealth: 100,
      isAlive: true,
    });
    this.entityManager.updateLocalPlayerId(playerId);
  }

  async requestMatchmaking(): Promise<void> {
    if (this.gameStateManager.isMatchmaking()) return;
    if (this.gameStateManager.isPlaying() && this.gameSession.isOnlineMatch) return;
    if (!this.communicationService.isConnected()) return;
    this.gameStateManager.setGameState('matchmaking');
    this.gameStateManager.setWinnerId('');
    await this.communicationService.requestMatchmaking();
  }

  async leaveGame(): Promise<void> {
    await this.communicationService.leaveGame();
    this.enterLocalSandbox();
  }

  async sendMessage(message: string, type: ChatMessageType): Promise<void> {
    await this.communicationService.sendMessage(message, type);
  }

  onMessageReceived = (_message: ChatMessageServer): void => {};

  onClose = async (error: Error | undefined): Promise<void> => {
    console.warn(`Lost connection with the server: ${error}`);
    this.enterLocalSandbox();
    let retryCounter = 1;
    while (!this.isExplicitlyStopped) {
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

  onLobbyStart = async (_lobbyId: string, players: Player[]): Promise<void> => {
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

    this.gameStateManager.setGameState('lobbyReady');
    await sleepAsync(1000);
    this.gameSession.isOnlineMatch = true;

    for (const player of players) {
      this.gameStateManager.addPlayer(player);
    }

    this.entityManager.updateLocalPlayerPosition(currentPlayer.position);
    await this.entityManager.updateLocalPlayerSprite(currentPlayer.spriteData);
    await this.entityManager.updateLocalPlayerSubEntities(currentPlayer.subEntities);

    this.movementController.resetPositionTracking();

    for (const player of players) {
      if (player.id !== playerId) {
        await this.entityManager.createRemotePlayer(player.id, player.position, player.spriteData, player.subEntities);
      }
    }

    this.gameStateManager.setGameState('playing');
  };

  onOtherPlayerPositionUpdated = async (playerId: string, position: Position): Promise<void> => {
    this.entityManager.updateEntityPosition(playerId, position);
  };

  onPlayerLeftLobby = async (playerId: string): Promise<void> => {
    this.entityManager.removeRemotePlayer(playerId);
    this.gameStateManager.removePlayer(playerId);
    if (this.gameStateManager.getAllPlayers().size === 1) {
      this.enterLocalSandbox();
    }
  };

  onPositionCorrected = async (correctedPosition: Position): Promise<void> => {
    this.movementController.onPositionCorrected(correctedPosition);
    console.log('Position corrected by server:', correctedPosition);
  };

  onAttackPerformed = async (attackEntities: AttackEntity[]): Promise<void> => {
    this.applyAttackPerformedEffects(attackEntities);
  };

  applyAttackPerformedEffects = (attackEntities: AttackEntity[]): void => {
    for (const attackEntity of attackEntities) {
      this.attackController.addAttack(attackEntity);
      switch (attackEntity.type) {
        case AttackTypeValue.Melee:
          this.animationController.createMeleeAttackAnimation(attackEntity.ownerId);
          break;
        case AttackTypeValue.Projectile:
          this.animationController.createProjectileAttackAnimation(attackEntity.ownerId);
          break;
        default:
          break;
      }
    }
    this.audioController.playShortRunningSound('/app/attack_swing.mp3');
  };

  onPlayerDamaged = async (playerId: string, _damage: number, newHealth: number): Promise<void> => {
    this.audioController.playShortRunningSound('/app/attack_damage.mp3', 0.4);
    this.gameStateManager.updatePlayerHealth(playerId, newHealth);
  };

  onPlayerDied = async (playerId: string): Promise<void> => {
    this.audioController.playShortRunningSound('/app/attack_damage.mp3', 0.4);
    this.audioController.playShortRunningSound('/app/player_death.mp3', 0.7);
    this.gameStateManager.updatePlayerHealth(playerId, 0, false);
    this.entityManager.hidePlayer(playerId);
  };

  onPlayerRespawned = async (playerId: string, position: Position): Promise<void> => {
    const player = this.gameStateManager.getPlayer(playerId);
    if (player) {
      this.gameStateManager.updatePlayerHealth(playerId, player.maxHealth, true);
    }
    this.entityManager.showPlayer(playerId, position);
    console.log('Player respawned:', { playerId, position });
  };

  onGameEnded = async (winnerId: string): Promise<void> => {
    this.gameStateManager.setGameState('ended');
    this.gameStateManager.setWinnerId(winnerId);
    sleepAsync(3000).then(() => this.enterLocalSandbox());
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
      this.movementController.update();
    }
    this.renderingService.render();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }
}
