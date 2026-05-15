import type { GameConfig } from './interfaces/gameConfig';
import { PlayerAttackController } from './playerAttackController';
import { PlayerEntityManager } from './playerEntityManager';
import { Game } from './game';
import { GameStateManager } from './gameStateManager';
import { PlayerInputHandler } from './playerInputHandler';
import { PlayerMovementController } from './playerMovementController';
import { Renderer } from './renderer';
import { CommunicationServiceWrapperForLocalGameplay } from './communicationServiceWrapperForLocalGameplay';
import { SignalRService } from './signalRService';
import { SpriteLoader } from './spriteLoader';
import { GameViewportManager } from './gameViewportManager';
import { GameAudioController } from './gameAudioController';
import { EntityAnimationController } from './entityAnimationController';
import { GameTime } from './gameTime';
import { SignalRCallbacksHandler } from './signalRCallbacksHandler';

export async function createGame(serverUrl: string, canvas: HTMLCanvasElement): Promise<Game> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }
  const playerSpriteData = {
    url: 'dability.png',
    width: 64,
    height: 32,
    scaleFactor: 8,
  };
  const arenaSpriteData = {
    url: 'arena_1.png',
    width: 1920,
    height: 1080,
    scaleFactor: 1,
  };
  const weaponSpriteData = {
    url: 'lightning_1.png',
    width: 17,
    height: 53,
    scaleFactor: 6,
  };
  const missingSprite = await SpriteLoader.loadMissingSprite();
  const response = await fetch('/gameconfig.json');
  const gameConfig: GameConfig = await response.json();

  const gameTime = new GameTime();
  const audioController = new GameAudioController();
  const gameStateManager = new GameStateManager();
  const viewportManager = new GameViewportManager(gameConfig, canvas);
  const callbacksHandler = new SignalRCallbacksHandler();
  const signalRService = new SignalRService(serverUrl, callbacksHandler);
  const gameSession = { isOnlineMatch: false };
  const communicationServiceWrapper = new CommunicationServiceWrapperForLocalGameplay(signalRService, gameSession);
  const spriteManager = new SpriteLoader(missingSprite);
  const localPlayerSprite = await spriteManager.getSpriteImage(playerSpriteData);
  const localPlayerPosition = { x: gameConfig.gameWidth / 2, y: gameConfig.gameHeight / 2, angle: 0 };
  const entityManager = new PlayerEntityManager(
    spriteManager,
    localPlayerPosition,
    playerSpriteData,
    localPlayerSprite,
  );
  await entityManager.addDefaultWeaponToLocalPlayer(weaponSpriteData);
  await entityManager.createEntity(
    'arena',
    {
      x: (arenaSpriteData.width * arenaSpriteData.scaleFactor) / 2,
      y: (arenaSpriteData.height * arenaSpriteData.scaleFactor) / 2,
      angle: 0,
    },
    arenaSpriteData,
    [],
    true,
  );
  const animationController = new EntityAnimationController(gameConfig, entityManager, gameTime);
  const inputHandler = new PlayerInputHandler(canvas);
  const movementController = new PlayerMovementController(
    gameConfig,
    entityManager,
    gameStateManager,
    inputHandler,
    communicationServiceWrapper,
    gameTime,
  );
  const attackController = new PlayerAttackController(
    gameConfig,
    entityManager,
    communicationServiceWrapper,
    gameStateManager,
    gameTime,
  );
  const renderingService = new Renderer(
    ctx,
    gameConfig,
    entityManager,
    viewportManager,
    gameStateManager,
    attackController,
    animationController,
    gameTime,
  );

  const game = new Game(
    communicationServiceWrapper,
    entityManager,
    gameStateManager,
    inputHandler,
    viewportManager,
    movementController,
    attackController,
    renderingService,
    audioController,
    animationController,
    gameTime,
    gameSession,
  );
  communicationServiceWrapper.attachLocalAttackBridge({
    gameConfig,
    entityManager,
    getCreationTime: () => gameTime.frameTimestamp,
    applyAttackEffects: game.applyAttackPerformedEffects,
  });
  callbacksHandler.handler = game;
  return game;
}
