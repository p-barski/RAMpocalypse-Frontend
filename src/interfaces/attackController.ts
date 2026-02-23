import { AttackType, Position } from '../messageInterfaces';

export interface AttackEntity {
  id: string;
  type: AttackType;
  currentPosition: Position;
  direction: Position;
  ownerId: string;
  lifetime: number; // Time in ms the attack should exist
  createdAt: number; // Timestamp when attack was created
}

export interface Projectile extends AttackEntity {
  type: AttackType.Projectile;
  speed: number;
}

export interface AttackController {
  performMeleeAttack(): void;
  performProjectileAttack(): void;
  performSpecialAttack(): void;
  getCooldownRemaining(attackType: AttackType): number;
  canPerformAttack(attackType: AttackType): boolean;
  addAttack(attack: Omit<AttackEntity, 'id' | 'createdAt'>): string;
  getAttacks(): AttackEntity[];
  update(deltaTime: number, currentFrameTime: number): void;
  clear(): void;
}
