import { AttackType } from '../messageInterfaces';

export interface AttackController {
  performMeleeAttack(): void;
  performProjectileAttack(): void;
  performSpecialAttack(): void;
  getCooldown(attackType: AttackType): number;
  getCooldownRemaining(attackType: AttackType): number;
  canPerformAttack(attackType: AttackType): boolean;
}
