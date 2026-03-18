import type { Player } from './messageInterfaces';

export type GameState = 'waiting' | 'playing' | 'ended';

export interface StateManager {
  getGameState(): GameState;
  setGameState(state: GameState): void;
  getWinnerId(): string;
  setWinnerId(winnerId: string): void;
  getPlayer(playerId: string): Player | undefined;
  addPlayer(player: Player): void;
  updatePlayerHealth(playerId: string, health: number, isAlive?: boolean): void;
  getAllPlayers(): Map<string, Player>;
  removePlayer(playerId: string): void;
  reset(): void;
  isPlaying(): boolean;
  hasEnded(): boolean;
  isWaiting(): boolean;
}
