import { AttackType, Position } from '../messageInterfaces';

export const PROJECTILE_SPEED = 800;

export interface AttackEntity {
  id: string;
  type: AttackType;
  currentPosition: Position;
  velocityVector: Position;
  ownerId: string;
  lifetime: number; // Time in ms the attack should exist
  createdAt: number; // Timestamp when attack was created
}

export interface AttackController {
  performMeleeAttack(): void;
  performProjectileAttack(): void;
  performSpecialAttack(): void;
  getCooldownRemaining(attackType: AttackType): number;
  canPerformAttack(attackType: AttackType): boolean;
  addAttack(playerId: string, attackType: number, attackPositions: Position[]): string;
  getAttacks(): AttackEntity[];
  update(deltaTime: number, currentFrameTime: number): void;
  clear(): void;
}
