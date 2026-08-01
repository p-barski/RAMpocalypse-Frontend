import type { Position, ChatMessageType, Vector2D } from './messageInterfaces';

export interface CommunicationService {
  connect: () => Promise<string>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
  sendMessage: (message: string, type: ChatMessageType) => Promise<void>;
  setPlayerName: (name: string) => Promise<void>;
  requestMatchmaking: () => Promise<void>;
  updatePlayerPosition: (position: Position) => Promise<void>;
  dash: (velocityVector: Vector2D) => Promise<boolean>;
  performMeleeAttack: () => Promise<void>;
  performProjectileAttack: () => Promise<void>;
  performSpecialAttack: () => Promise<void>;
  projectileHitPlayer: (projectileId: string, hitPlayerId: string) => Promise<void>;
  specialExplosion: (attackId: string) => Promise<void>;
  leaveGame: () => Promise<void>;
}
