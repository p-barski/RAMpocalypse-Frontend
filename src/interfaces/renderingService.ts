/**
 * IRenderingService - Interface for the rendering service
 *
 * Responsible for all visual rendering operations including:
 * - Entities (players) with health bars
 * - Attacks (melee, projectile, special)
 * - UI overlays (game state, cooldowns)
 * - Game world border
 */
export interface RenderingService {
  /**
   * Performs a complete render frame
   * Clears the canvas and renders all game elements in the correct order
   */
  render(): void;

  /**
   * Gets the canvas rendering context for advanced operations
   */
  getCanvasContext(): CanvasRenderingContext2D;

  /**
   * Sets the local player ID for rendering health bars and determining win/loss state
   */
  setLocalPlayerId(playerId: string): void;

  /**
   * Gets the current local player ID
   */
  getLocalPlayerId(): string | null;
}
