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
  const spriteData = {
    url: `${serverUrl}/assets/sprites/player_1.png`,
    width: 64,
    height: 32,
    scaleFactor: 8,
  };
  const fallbackImage = await ResourceLoader.loadImage(spriteData.url);
  // Create all services with dependency injection
  const signalRService = new SignalRService(serverUrl, abortController.signal);
  const spriteManager = new SpriteLoader(serverUrl, fallbackImage);
  const entityManager = new PlayerEntityManager(spriteManager);
  const gameStateManager = new GameStateManager();
  const viewportManager = new GameViewportManager(canvas);
  const inputHandler = new PlayerInputHandler(canvas, viewportManager);
  const movementController = new PlayerMovementController(
    entityManager,
    gameStateManager,
    inputHandler,
    signalRService,
  );
  const attackController = new PlayerAttackController(entityManager, signalRService, gameStateManager, inputHandler);
  const renderingService = new Renderer(canvas, entityManager, viewportManager, gameStateManager, attackController);

  // Create game with all dependencies injected
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
  game.addEntity(fallbackImage, { x: 100, y: 100 }, spriteData);
  return game;
}
