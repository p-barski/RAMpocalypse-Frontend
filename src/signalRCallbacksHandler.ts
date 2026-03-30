import type { CallbacksHandler } from './interfaces/callbacksHandler';
import type { AttackEntity, Player, Position, ChatMessageServer } from './interfaces/messageInterfaces';

export class SignalRCallbacksHandler implements CallbacksHandler {
  handler!: CallbacksHandler; // setup after creating Game, before connecting to server
  onMessageReceived = (message: ChatMessageServer) => this.handler.onMessageReceived(message);
  onClose = (error: Error | undefined) => this.handler.onClose(error);
  onLobbyStart = (lobbyId: string, players: Player[]) => this.handler.onLobbyStart(lobbyId, players);
  onOtherPlayerPositionUpdated = (playerId: string, position: Position) =>
    this.handler.onOtherPlayerPositionUpdated(playerId, position);
  onPlayerLeftLobby = (playerId: string) => this.handler.onPlayerLeftLobby(playerId);
  onPositionCorrected = (correctedPosition: Position) => this.handler.onPositionCorrected(correctedPosition);
  onAttackPerformed = (attackEntities: AttackEntity[]) => this.handler.onAttackPerformed(attackEntities);
  onPlayerDamaged = (playerId: string, damage: number, newHealth: number) =>
    this.handler.onPlayerDamaged(playerId, damage, newHealth);
  onPlayerDied = (playerId: string) => this.handler.onPlayerDied(playerId);
  onPlayerRespawned = (playerId: string, position: Position) => this.handler.onPlayerRespawned(playerId, position);
  onGameEnded = (winnerId: string) => this.handler.onGameEnded(winnerId);
}
