import type { Entity } from './entity';
import type { Position } from './messageInterfaces';

export interface AnimationStep {
  position: Position;
  percent: number; // percentage from 0 to 1
}
export interface Animation {
  readonly entity: Entity;
  readonly durationMiliseconds: number;
  readonly looping: boolean;
  readonly steps: AnimationStep[];
  readonly startTime: number;
  // Offsets are expressed in the parent's frame without its facing angle applied
  readonly ignoresParentAngle?: boolean;
}

export interface LegLifts {
  left: number;
  right: number;
}

export interface AnimationController {
  createMeleeAttackAnimation(playerId: string): void;
  createProjectileAttackAnimation(playerId: string): void;
  createSpecialAttackAnimation(playerId: string): void;
  createArmSwitchAnimation(playerId: string): void;
  getAnimatedEntity(entity: Entity, parentAngle?: number): Entity;
  getWalkingLegLifts(player: Entity): LegLifts;
  resetWalkState(entityId: string): void;
}
