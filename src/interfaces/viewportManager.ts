export interface ViewportManager {
  readonly GAME_WIDTH: number;
  readonly GAME_HEIGHT: number;
  readonly viewportX: number;
  readonly viewportY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly scale: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  resizeCanvas(): void;
  cleanup(): void;
  gameToCanvasX(gameX: number): number;
  gameToCanvasY(gameY: number): number;
  gameToCanvasSize(gameSize: number): number;
}
