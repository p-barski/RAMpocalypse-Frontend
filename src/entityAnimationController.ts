import type { Animation, AnimationController, AnimationStep } from './interfaces/animationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Time } from './interfaces/time';
import type { Position } from './interfaces/messageInterfaces';
import type { Entity } from './interfaces/entity';
import type { GameConfig } from './interfaces/gameConfig';

const STEP_ZERO: AnimationStep = { position: { x: 0, y: 0, angle: 0 } satisfies Position, percent: 0 };

export class EntityAnimationController implements AnimationController {
  private readonly animations: Map<string, Animation> = new Map();
  private readonly gameConfig: GameConfig;
  private readonly entityManager: EntityManager;
  private readonly time: Time;

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
    const quarterWidth = entity.width / 4;
    const quarterHeight = entity.height / 4;
    const steps: AnimationStep[] = [
      { position: { x: -2 * quarterWidth, y: -2 * quarterHeight, angle: +Math.PI } satisfies Position, percent: 0.5 },
      { position: { x: +2 * quarterWidth, y: +2 * quarterHeight, angle: -Math.PI } satisfies Position, percent: 1 },
    ];
    const animation: Animation = {
      entity: weapon,
      durationMiliseconds: this.gameConfig.meleeCooldownMs,
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
      durationMiliseconds: this.gameConfig.projectileCooldownMs / 2,
      looping: false,
      startTime: this.time.frameTimestamp,
      steps,
    };
    this.animations.set(weapon.id, animation);
  }

  getAnimatedEntity(entity: Entity): Entity {
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
    const cos = Math.cos(entity.position.angle);
    const sin = Math.sin(entity.position.angle);
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
