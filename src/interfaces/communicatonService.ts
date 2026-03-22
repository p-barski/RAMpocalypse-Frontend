import type { Position } from './messageInterfaces';

export interface CommunicationService {
  connect: () => Promise<string>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
  requestMatchmaking: () => Promise<void>;
  updatePlayerPosition: (position: Position) => Promise<void>;
  performMeleeAttack: () => Promise<void>;
  performProjectileAttack: () => Promise<void>;
  performSpecialAttack: () => Promise<void>;
  projectileHitPlayer: (projectileId: string, hitPlayerId: string) => Promise<void>;
  leaveGame: () => Promise<void>;
}
