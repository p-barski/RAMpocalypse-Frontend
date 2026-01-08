import { Player, Position } from './messageInterfaces';

export interface CallbacksHandler {
  onLobbyStart: (lobbyId: string, players: Player[]) => void;
  onOtherPlayerPositionUpdated: (playerId: string, x: number, y: number) => void;
  onPlayerLeftLobby: (playerId: string) => void;
  onPositionCorrected: (x: number, y: number) => void;
  onAttackPerformed: (
    playerId: string,
    attackType: number,
    attackPosition: Position,
    attackDirection: Position,
  ) => void;
  onPlayerDamaged: (playerId: string, damage: number, newHealth: number) => void;
  onPlayerDied: (playerId: string) => void;
  onPlayerRespawned: (playerId: string, x: number, y: number) => void;
  onGameEnded: (winnerId: string, players: Player[]) => void;
}
