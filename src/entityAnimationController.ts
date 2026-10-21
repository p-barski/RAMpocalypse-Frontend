import type { Animation, AnimationController, AnimationStep, LegLifts } from './interfaces/animationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Time } from './interfaces/time';
import type { Position } from './interfaces/messageInterfaces';
import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';
import { clamp, TAU } from './mathUtils';

const STEP_ZERO: AnimationStep = { position: { x: 0, y: 0, angle: 0 } satisfies Position, percent: 0 };

interface WalkState {
  x: number;
  y: number;
  lastMovedAt: number;
  phase: number;
  intensity: number;
}

export class EntityAnimationController implements AnimationController {
  private readonly animations: Map<string, Animation> = new Map();
  private readonly walkStates: Map<string, WalkState> = new Map();
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly time: Time;

  private readonly WALK_CYCLE_S = 0.3;
  private readonly WALK_LIFT_RATIO = 0.06;
  private readonly WALK_STOP_DELAY_MS = 150;
  private readonly WALK_BLEND_S = 0.05;

  constructor(gameConfig: GameConfig, entityManager: EntityManager, time: Time) {
    this.gameConfig = gameConfig;
    this.entityManager = entityManager;
    this.time = time;
  }

  createMeleeAttackAnimation(playerId: string): void {
    const found = this.getWeaponForPlayer(playerId);
    if (found === undefined) {
      return;
    }
    const entity = found.player;
    const weapon = found.weapon;
    // Sweeps the weapon through the front-facing half circle (left -> forward -> right)
    // that matches melee hit-detection area
    const swingRadius = (entity.width + entity.height) / 4;
    const sweepKeyframes: { percent: number; position: Position }[] = [
      { percent: 0.2, position: { x: -swingRadius, y: 0, angle: -Math.PI / 2 } satisfies Position },
      { percent: 0.5, position: { x: 0, y: -swingRadius, angle: 0 } satisfies Position },
      { percent: 0.8, position: { x: swingRadius, y: 0, angle: Math.PI / 2 } satisfies Position },
      { percent: 1, position: { x: 0, y: 0, angle: 0 } satisfies Position },
    ];

    const steps: AnimationStep[] = [];
    let previous: Position = { x: 0, y: 0, angle: 0 };
    for (const { percent, position } of sweepKeyframes) {
      steps.push({
        position: {
          x: position.x - previous.x,
          y: position.y - previous.y,
          angle: position.angle - previous.angle,
        } satisfies Position,
        percent,
      });
      previous = position;
    }

    const animation: Animation = {
      entity: weapon,
      durationMiliseconds: this.gameConfig.sharedAttackCooldownMs,
      looping: false,
      startTime: this.time.frameTimestamp,
      steps,
    };
    this.animations.set(weapon.id, animation);
  }

  createProjectileAttackAnimation(playerId: string): void {
    const found = this.getWeaponForPlayer(playerId);
    if (found === undefined) {
      return;
    }
    const weapon = found.weapon;
    const fivePercentOfWeaponHeight = weapon.height * 0.05;
    const steps: AnimationStep[] = [
      { position: { x: 0, y: -2 * fivePercentOfWeaponHeight, angle: 0 } satisfies Position, percent: 0.125 },
      { position: { x: 0, y: -fivePercentOfWeaponHeight, angle: 0 } satisfies Position, percent: 0.25 },
      { position: { x: 0, y: 3 * fivePercentOfWeaponHeight, angle: 0 } satisfies Position, percent: 1 },
    ];
    const animation: Animation = {
      entity: weapon,
      durationMiliseconds: this.gameConfig.sharedAttackCooldownMs,
      looping: false,
      startTime: this.time.frameTimestamp,
      steps,
    };
    this.animations.set(weapon.id, animation);
  }
  createSpecialAttackAnimation(playerId: string): void {
    this.createProjectileAttackAnimation(playerId);
  }

  // parentAngle - angle of the frame animation offsets are expressed in, on top of entity's own angle
  getAnimatedEntity(entity: Entity, parentAngle = 0): Entity {
    const animation = this.animations.get(entity.id);
    if (animation === undefined) {
      return entity;
    }
    let animationProgressPercent = (this.time.frameTimestamp - animation.startTime) / animation.durationMiliseconds;
    if (animationProgressPercent >= 1) {
      if (!animation.looping) {
        this.animations.delete(entity.id);
        return entity;
      }
      animationProgressPercent -= Math.trunc(animationProgressPercent);
    }

    let currentStep = STEP_ZERO;
    let nextStep = currentStep;
    let offsetX = 0;
    let offsetY = 0;
    let offsetAngle = 0;
    for (const step of animation.steps) {
      currentStep = nextStep;
      nextStep = step;
      offsetX += currentStep.position.x;
      offsetY += currentStep.position.y;
      offsetAngle += currentStep.position.angle;
      if (animationProgressPercent <= step.percent) {
        break;
      }
    }

    const stepProgressPercent =
      (animationProgressPercent - currentStep.percent) / (nextStep.percent - currentStep.percent);
    offsetX += nextStep.position.x * stepProgressPercent;
    offsetY += nextStep.position.y * stepProgressPercent;
    offsetAngle += nextStep.position.angle * stepProgressPercent;
    const cos = Math.cos(parentAngle + entity.position.angle);
    const sin = Math.sin(parentAngle + entity.position.angle);
    const newPosition: Position = {
      x: entity.position.x + (offsetX * cos - offsetY * sin),
      y: entity.position.y + (offsetX * sin + offsetY * cos),
      angle: entity.position.angle + offsetAngle,
    };
    const newEntity: Entity = {
      ...entity,
    };
    newEntity.position = newPosition;
    return newEntity;
  }

  getWalkingLegLifts(player: Entity): LegLifts {
    const state = this.updateWalkState(player);
    const maxLift = player.height * this.WALK_LIFT_RATIO * state.intensity;
    return {
      left: Math.max(0, Math.sin(state.phase)) * maxLift,
      right: Math.max(0, -Math.sin(state.phase)) * maxLift,
    };
  }

  resetWalkState(entityId: string): void {
    this.walkStates.delete(entityId);
  }

  private updateWalkState(player: Entity): WalkState {
    let state = this.walkStates.get(player.id);
    if (!state) {
      state = { x: player.position.x, y: player.position.y, lastMovedAt: -Infinity, phase: 0, intensity: 0 };
      this.walkStates.set(player.id, state);
    }

    if (player.position.x !== state.x || player.position.y !== state.y) {
      state.x = player.position.x;
      state.y = player.position.y;
      state.lastMovedAt = this.time.frameTimestamp;
    }

    const isWalking = this.time.frameTimestamp - state.lastMovedAt <= this.WALK_STOP_DELAY_MS;
    const blendStep = this.time.deltaTime / this.WALK_BLEND_S;
    state.intensity = clamp(state.intensity + (isWalking ? blendStep : -blendStep), 0, 1);
    if (state.intensity > 0) {
      state.phase = (state.phase + (this.time.deltaTime / this.WALK_CYCLE_S) * TAU) % TAU;
    }
    return state;
  }

  private getWeaponForPlayer(playerId: string): { player: Entity; weapon: Entity } | undefined {
    const entity = this.entityManager.getEntityById(playerId);
    if (entity === undefined) {
      console.error(`Player entity with id ${playerId} does not exist.`);
      return undefined;
    }
    let weapon: Entity | undefined;
    for (const subEntity of entity.subEntities) {
      if (subEntity.id.startsWith('weapon_')) {
        weapon = subEntity;
        break;
      }
    }
    if (weapon === undefined) {
      console.error(`Player with id ${playerId} has no weapon to attack with.`);
      return undefined;
    }
    return { player: entity, weapon };
  }
}
