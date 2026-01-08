export interface ViewportManager {
  resizeCanvas(): void;
  cleanup(): void;
  gameToCanvasX(gameX: number): number;
  gameToCanvasY(gameY: number): number;
  gameToCanvasSize(gameSize: number): number;
  getViewportX(): number;
  getViewportY(): number;
  getViewportWidth(): number;
  getViewportHeight(): number;
  getScaleX(): number;
  getScaleY(): number;
  getCanvasWidth(): number;
  getCanvasHeight(): number;
  getDisplayWidth(): number;
  getDisplayHeight(): number;
}
