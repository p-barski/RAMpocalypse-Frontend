import type { Player } from './interfaces/messageInterfaces';
import type { GameState, StateManager } from './interfaces/stateManager';

export class GameStateManager implements StateManager {
  private gameState: GameState = 'waiting';
  private winnerId = '';
  private players: Map<string, Player> = new Map();

  getGameState(): GameState {
    return this.gameState;
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  getWinnerId(): string {
    return this.winnerId;
  }

  setWinnerId(winnerId: string): void {
    this.winnerId = winnerId;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  updatePlayerHealth(playerId: string, health: number, isAlive?: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.health = health;
      if (isAlive !== undefined) {
        player.isAlive = isAlive;
      }
    }
  }

  getAllPlayers(): Map<string, Player> {
    return this.players;
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  reset(): void {
    this.gameState = 'waiting';
    this.winnerId = '';
    this.players.clear();
  }

  isPlaying(): boolean {
    return this.gameState === 'playing' || this.gameState === 'matchmaking';
  }

  isMatchmaking(): boolean {
    return this.gameState === 'matchmaking';
  }

  isLobbyReady(): boolean {
    return this.gameState === 'lobbyReady';
  }

  hasEnded(): boolean {
    return this.gameState === 'ended';
  }

  isWaiting(): boolean {
    return this.gameState === 'waiting';
  }
}
