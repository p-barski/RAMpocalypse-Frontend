import { PlayerAttackController } from './playerAttackController';
import { PlayerEntityManager } from './playerEntityManager';
import { Game } from './game';
import { GameStateManager } from './gameStateManager';
import { PlayerInputHandler } from './playerInputHandler';
import { PlayerMovementController } from './playerMovementController';
import { Renderer } from './renderer';
import { ResourceLoader } from './resourceLoader';
import { SignalRService } from './signalRService';
import { SpriteLoader } from './spriteLoader';
import { GameViewportManager } from './gameViewportManager';

/**
 * Factory method to create a new game instance with all dependencies injected.
 * @param serverUrl - The URL of the server to connect to.
 * @param abortController - The abort controller to abort the game.
 * @param canvas - The canvas element to render the game to.
 * @returns A new game instance.
 */
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
    url: `${serverUrl}/assets/sprites/player_1.png`,
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
  let fallbackImage: ImageBitmap;
  try {
    fallbackImage = await ResourceLoader.loadImage(playerSpriteData.url);
  } catch (error) {
    fallbackImage = await createImageBitmap(new ImageData(64, 32));
  }

  const gameStateManager = new GameStateManager();
  const viewportManager = new GameViewportManager(canvas);
  const signalRService = new SignalRService(serverUrl, abortController.signal);
  const spriteManager = new SpriteLoader(fallbackImage);
  const localPlayerSprite = await spriteManager.getSpriteForVariant(playerSpriteData);
  const localPlayerPosition = { x: viewportManager.GAME_WIDTH / 2, y: viewportManager.GAME_HEIGHT / 2, angle: 0 };
  const entityManager = new PlayerEntityManager(
    spriteManager,
    localPlayerPosition,
    playerSpriteData,
    localPlayerSprite,
  );
  await entityManager.createEntity({ x: 0, y: 0, angle: 0 }, arenaSpriteData, true);
  const inputHandler = new PlayerInputHandler(canvas, viewportManager);
  const movementController = new PlayerMovementController(
    entityManager,
    gameStateManager,
    inputHandler,
    signalRService,
  );
  const attackController = new PlayerAttackController(entityManager, signalRService, gameStateManager, inputHandler);
  const renderingService = new Renderer(ctx, entityManager, viewportManager, gameStateManager, attackController);

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
  );
  return game;
}
