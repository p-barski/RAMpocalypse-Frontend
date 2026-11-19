import { loadGameConfig } from './gameConfigLoader';
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
import type { GameSettings } from './gameSettings';
import { AttackTypeValue, type AttackType, type SpriteData } from './interfaces/messageInterfaces';

export async function createGame(serverUrl: string, canvas: HTMLCanvasElement, settings: GameSettings): Promise<Game> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }
  const playerSpriteData = {
    url: '/app/player_1.png',
    width: 420,
    height: 128,
    scaleFactor: 1.0,
    opacity: 1,
  };
  const arenaSpriteData = {
    url: '/app/arena.png',
    width: 1920,
    height: 1080,
    scaleFactor: 1.0,
    opacity: 1,
  };
  const weaponSpriteData = {
    url: '/app/weapon_1.png',
    width: 79,
    height: 232,
    scaleFactor: 0.646,
    opacity: 1,
  };
  const specialAttackSpriteData = {
    url: '/app/special_attack.png',
    width: 222,
    height: 222,
    scaleFactor: 0.45,
    opacity: 1,
  };
  const projectileSpriteData = {
    url: '/app/projectile.png',
    width: 64,
    height: 64,
    scaleFactor: 0.6,
    opacity: 1,
  };
  const meleeSpriteData = {
    url: '/app/melee.png',
    width: 222,
    height: 222,
    scaleFactor: 1.0,
    opacity: 1,
  };
  const attackSprites = new Map<AttackType, SpriteData>([
    [AttackTypeValue.Melee, meleeSpriteData],
    [AttackTypeValue.Projectile, projectileSpriteData],
    [AttackTypeValue.Special, specialAttackSpriteData],
  ]);
  const missingSprite = await SpriteLoader.loadMissingSprite();
  const gameConfig = await loadGameConfig();

  const gameTime = new GameTime();
  const audioController = new GameAudioController(settings.audio);
  const gameStateManager = new GameStateManager();
  const viewportManager = new GameViewportManager(gameConfig, canvas);
  const callbacksHandler = new SignalRCallbacksHandler();
  const signalRService = new SignalRService(serverUrl, callbacksHandler);
  const gameSession = { isOnlineMatch: false };
  const communicationServiceWrapper = new CommunicationServiceWrapperForLocalGameplay(signalRService, gameSession);
  const spriteManager = new SpriteLoader(missingSprite);
  // Load to cache
  for (const [_, spriteData] of attackSprites) {
    spriteManager.getSpriteImage(spriteData);
  }
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
  const inputHandler = new PlayerInputHandler(canvas, settings.controls);
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
    animationController,
    gameTime,
    attackSprites,
  );
  const renderingService = new Renderer(
    ctx,
    gameConfig,
    entityManager,
    viewportManager,
    gameStateManager,
    attackController,
    movementController,
    animationController,
    gameTime,
    settings.controls,
  );

  const game = new Game(
    gameConfig,
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
    settings.playerName,
  );
  communicationServiceWrapper.attachLocalAttackBridge({
    gameConfig,
    entityManager,
    getCreationTime: () => gameTime.frameTimestamp,
    applyAttackEffects: game.applyAttackPerformedEffects,
    applyArmSwitchEffects: game.applyArmSwitchEffects,
  });
  callbacksHandler.handler = game;
  return game;
}
