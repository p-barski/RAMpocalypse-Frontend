import type { AttackEntity, Player, Position } from './messageInterfaces';

export interface CallbacksHandler {
  onClose: (error: Error | undefined) => Promise<void>;
  onLobbyStart: (lobbyId: string, players: Player[]) => void;
  onOtherPlayerPositionUpdated: (playerId: string, position: Position) => void;
  onPlayerLeftLobby: (playerId: string) => void;
  onPositionCorrected: (correctedPosition: Position) => void;
  onAttackPerformed: (attackEntities: AttackEntity[]) => void;
  onPlayerDamaged: (playerId: string, damage: number, newHealth: number) => void;
  onPlayerDied: (playerId: string) => void;
  onPlayerRespawned: (playerId: string, position: Position) => void;
  onGameEnded: (winnerId: string) => void;
}
