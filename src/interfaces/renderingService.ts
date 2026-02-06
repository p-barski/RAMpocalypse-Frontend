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
  render(): void;
  setLocalPlayerId(playerId: string): void;
}
