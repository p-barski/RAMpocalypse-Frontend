import type { GameConfig } from './interfaces/gameConfig';

let gameConfigPromise: Promise<GameConfig> | null = null;

export function loadGameConfig(): Promise<GameConfig> {
  if (!gameConfigPromise) {
    gameConfigPromise = fetch('/app/gameconfig.json').then((response) => response.json());
  }
  return gameConfigPromise;
}
