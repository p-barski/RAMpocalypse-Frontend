import { CallbacksHandler } from './callbacksHandler';
import { Position } from './messageInterfaces';

export interface CommunicationService {
  connect: (callbacksHandler: CallbacksHandler) => Promise<string>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
  requestMatchmaking: () => Promise<boolean>;
  updatePlayerPosition: (position: Position) => Promise<void>;
  performMeleeAttack: (attackDirection: Position) => Promise<void>;
  performProjectileAttack: (direction: Position) => Promise<void>;
  performSpecialAttack: (position: Position) => Promise<void>;
  reportProjectileHit: (projectileOwnerId: string, hitPlayerId: string, x: number, y: number) => Promise<void>;
  leaveGame: () => Promise<void>;
}
