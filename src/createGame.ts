import { PlayerAttackController } from './playerAttackController';
import { PlayerEntityManager } from './playerEntityManager';
import { Game } from './game';
import { GameStateManager } from './gameStateManager';
import { PlayerInputHandler } from './playerInputHandler';
import { PlayerMovementController } from './playerMovementController';
import { Renderer } from './renderer';
import { SignalRService } from './signalRService';
import { SpriteLoader } from './spriteLoader';
import { GameViewportManager } from './gameViewportManager';
import { GameAudioController } from './gameAudioController';
import { EntityAnimationController } from './entityAnimationController';
import { GameTime } from './gameTime';

export async function createGame(
  serverUrl: string,
  abortController: AbortController,
  canvas: HTMLCanvasElement,
): Promise<Game> {
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

  const gameTime = new GameTime();
  const audioController = new GameAudioController();
  const gameStateManager = new GameStateManager();
  const viewportManager = new GameViewportManager(canvas);
  const signalRService = new SignalRService(serverUrl, abortController.signal);
  const spriteManager = new SpriteLoader(missingSprite);
  const localPlayerSprite = await spriteManager.getSpriteImage(playerSpriteData);
  const localPlayerPosition = { x: viewportManager.GAME_WIDTH / 2, y: viewportManager.GAME_HEIGHT / 2, angle: 0 };
  const entityManager = new PlayerEntityManager(
    spriteManager,
    localPlayerPosition,
    playerSpriteData,
    localPlayerSprite,
  );
  entityManager.updateLocalPlayerSubEntities([
    {
      position: { x: playerSpriteData.width * playerSpriteData.scaleFactor - 10, y: 0, angle: 0 },
      spriteData: weaponSpriteData,
      id: 'weapon',
      subEntities: [],
    },
  ]);
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
  const animationController = new EntityAnimationController(entityManager, gameTime);
  const inputHandler = new PlayerInputHandler(canvas, viewportManager);
  const movementController = new PlayerMovementController(
    entityManager,
    gameStateManager,
    inputHandler,
    signalRService,
  );
  const attackController = new PlayerAttackController(entityManager, signalRService, gameStateManager, inputHandler);
  const renderingService = new Renderer(
    ctx,
    entityManager,
    viewportManager,
    gameStateManager,
    attackController,
    animationController,
    gameTime,
  );

  const game = new Game(
    signalRService,
    abortController.signal,
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
  );
  return game;
}
