import type { Animation, AnimationController, AnimationStep } from './interfaces/animationController';
import type { EntityManager } from './interfaces/entityManager';
import type { Time } from './interfaces/time';
import type { Position } from './messageInterfaces';
import type { Entity } from './entity';

export class EntityAnimationController implements AnimationController {
  private readonly STEP_ZERO: AnimationStep = { position: { x: 0, y: 0, angle: 0 } satisfies Position, percent: 0 };
  private readonly animations: Map<string, Animation> = new Map();
  private readonly entityManager: EntityManager;
  private readonly time: Time;

  constructor(entityManager: EntityManager, time: Time) {
    this.entityManager = entityManager;
    this.time = time;
  }

  createMeleeAttackAnimation(playerId: string): void {
    const entity = this.entityManager.getEntityById(playerId);
    if (entity === undefined) {
      console.error(`Player entity with id ${playerId} does not exist.`);
      return;
    }
    let weapon: Entity | undefined = undefined;
    for (const subEntity of entity.subEntities) {
      if (subEntity.id.startsWith('weapon_')) {
        weapon = subEntity;
        break;
      }
    }
    if (weapon === undefined) {
      // Shouldn't happen
      console.error(`Player with id ${playerId} has no weapon to attack with.`);
      return;
    }
    const quarterWidth = entity.width / 4;
    const quarterHeight = entity.height / 4;
    const halfPI = Math.PI / 2;
    const steps: AnimationStep[] = [
      { position: { x: -quarterWidth, y: -quarterHeight, angle: +halfPI } satisfies Position, percent: 0.25 },
      { position: { x: -quarterWidth, y: -quarterHeight, angle: +halfPI } satisfies Position, percent: 0.5 },
      { position: { x: +quarterWidth, y: +quarterHeight, angle: -halfPI } satisfies Position, percent: 0.75 },
      { position: { x: +quarterWidth, y: +quarterHeight, angle: -halfPI } satisfies Position, percent: 1 },
    ];
    const animation: Animation = {
      entity: weapon,
      durationMiliseconds: 700, //TODO should be the same as attack cooldown
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

    let currentStep = this.STEP_ZERO;
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
}
