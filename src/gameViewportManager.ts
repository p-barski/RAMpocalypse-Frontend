import { ViewportManager } from './interfaces/viewportManager';

/**
 * ViewportManager - Manages viewport/canvas sizing, scaling, and coordinate conversion
 *
 * Handles:
 * - Canvas resizing based on window size and device pixel ratio
 * - Maintaining aspect ratio of the game world
 * - Converting between game world coordinates and canvas coordinates
 * - Viewport positioning (centering the game world on the canvas)
 */
export class GameViewportManager implements ViewportManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly guid = crypto.randomUUID();

  // Game world dimensions (fixed)
  private readonly GAME_WIDTH = 1920;
  private readonly GAME_HEIGHT = 1080;
  private readonly BORDER_WIDTH = 2;

  // Viewport state (calculated on resize)
  private viewportX = 0;
  private viewportY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private scaleX = 1;
  private scaleY = 1;

  // Display dimensions (cached for convenience)
  private displayWidth = 0;
  private displayHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    window.addEventListener('resize', this.resizeCanvas);
    this.resizeCanvas();
  }

  resizeCanvas = (): void => {
    console.log(`resizeCanvas ${this.guid}`);
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1; // Includes browser zoom

    // Set canvas internal resolution to account for device pixel ratio (browser zoom)
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    this.canvas.width = this.displayWidth * dpr;
    this.canvas.height = this.displayHeight * dpr;

    // Reset transform and scale context to match device pixel ratio
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.scale(dpr, dpr);

    // Now work with display coordinates (not internal resolution)
    // Calculate scale to fit game world in canvas (maintain aspect ratio)
    const availableWidth = this.displayWidth - this.BORDER_WIDTH * 2;
    const availableHeight = this.displayHeight - this.BORDER_WIDTH * 2;
    const scaleX = availableWidth / this.GAME_WIDTH;
    const scaleY = availableHeight / this.GAME_HEIGHT;
    this.scaleX = this.scaleY = Math.min(scaleX, scaleY); // Use uniform scaling

    // Calculate actual viewport size (scaled game world)
    this.viewportWidth = this.GAME_WIDTH * this.scaleX;
    this.viewportHeight = this.GAME_HEIGHT * this.scaleY;

    // Center viewport on canvas (using display coordinates)
    this.viewportX = (this.displayWidth - this.viewportWidth) / 2;
    this.viewportY = (this.displayHeight - this.viewportHeight) / 2;
  };

  cleanup(): void {
    window.removeEventListener('resize', this.resizeCanvas);
  }

  gameToCanvasX(gameX: number): number {
    return this.viewportX + gameX * this.scaleX;
  }

  gameToCanvasY(gameY: number): number {
    return this.viewportY + gameY * this.scaleY;
  }

  gameToCanvasSize(gameSize: number): number {
    return gameSize * this.scaleX;
  }

  getViewportX(): number {
    return this.viewportX;
  }

  getViewportY(): number {
    return this.viewportY;
  }

  getViewportWidth(): number {
    return this.viewportWidth;
  }

  getViewportHeight(): number {
    return this.viewportHeight;
  }

  getScaleX(): number {
    return this.scaleX;
  }

  getScaleY(): number {
    return this.scaleY;
  }

  getCanvasWidth(): number {
    return this.canvas.width;
  }

  getCanvasHeight(): number {
    return this.canvas.height;
  }

  getDisplayWidth(): number {
    return this.displayWidth;
  }

  getDisplayHeight(): number {
    return this.displayHeight;
  }
}
