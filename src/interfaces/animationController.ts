import { Entity } from '../entity';
import { Position } from '../messageInterfaces';
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
}
export interface AnimationController {
  createMeleeAttackAnimation(playerId: string): void;
  getAnimatedEntity(entity: Entity): Entity;
}
