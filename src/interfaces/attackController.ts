import type { AttackType, AttackEntity } from './messageInterfaces';

export interface AttackController {
  performMeleeAttack(): void;
  performProjectileAttack(): void;
  performSpecialAttack(): void;
  switchArm(): void;
  getArmSwitchCdRemaining(): number;
  getCooldownRemaining(attackType: AttackType): number;
  addAttack(entity: AttackEntity): void;
  getAttacks(): AttackEntity[];
  update(): void;
  clear(): void;
}
