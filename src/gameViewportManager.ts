import { ViewportManager } from './interfaces/viewportManager';

export class GameViewportManager implements ViewportManager {
  public readonly GAME_WIDTH = 1920;
  public readonly GAME_HEIGHT = 1080;
  // Viewport state (calculated on resize)
  public viewportX = 0;
  public viewportY = 0;
  public viewportWidth = 0;
  public viewportHeight = 0;
  public scale = 1;

  // Display dimensions (cached for convenience)
  public displayWidth = 0;
  public displayHeight = 0;
  private readonly BORDER_WIDTH = 2;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

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
    this.ctx.imageSmoothingEnabled = false;

    // Now work with display coordinates (not internal resolution)
    // Calculate scale to fit game world in canvas (maintain aspect ratio)
    const availableWidth = this.displayWidth - this.BORDER_WIDTH * 2;
    const availableHeight = this.displayHeight - this.BORDER_WIDTH * 2;
    const scaleX = availableWidth / this.GAME_WIDTH;
    const scaleY = availableHeight / this.GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY); // Use uniform scaling

    // Calculate actual viewport size (scaled game world)
    this.viewportWidth = this.GAME_WIDTH * this.scale;
    this.viewportHeight = this.GAME_HEIGHT * this.scale;

    // Center viewport on canvas (using display coordinates)
    this.viewportX = (this.displayWidth - this.viewportWidth) / 2;
    this.viewportY = (this.displayHeight - this.viewportHeight) / 2;
  };

  cleanup(): void {
    window.removeEventListener('resize', this.resizeCanvas);
  }

  gameToCanvasX(gameX: number): number {
    return this.viewportX + gameX * this.scale;
  }

  gameToCanvasY(gameY: number): number {
    return this.viewportY + gameY * this.scale;
  }

  gameToCanvasSize(gameSize: number): number {
    return gameSize * this.scale;
  }
}
