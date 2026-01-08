import { AttackType, Position } from './messageInterfaces';

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

export class AttackManager {
  private attacks: Map<string, AttackEntity> = new Map();
  private nextAttackId = 0;

  addAttack(attack: Omit<AttackEntity, 'id' | 'createdAt'>): string {
    const id = `attack_${this.nextAttackId++}`;
    const attackEntity: AttackEntity = {
      ...attack,
      id,
      createdAt: Date.now(),
    };
    this.attacks.set(id, attackEntity);
    return id;
  }

  getAttacks(): AttackEntity[] {
    return Array.from(this.attacks.values());
  }

  update(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, attack] of Array.from(this.attacks.entries())) {
      const age = now - attack.createdAt;
      if (age >= attack.lifetime) {
        toRemove.push(id);
      } else if (attack.type === AttackType.Projectile) {
        // Update projectile position
        const projectile = attack as Projectile;
        if (projectile.speed && projectile.speed > 0) {
          attack.currentPosition.x += projectile.direction.x * projectile.speed * (deltaTime / 1000);
          attack.currentPosition.y += projectile.direction.y * projectile.speed * (deltaTime / 1000);
        }
      }
    }

    for (const id of toRemove) {
      this.attacks.delete(id);
    }
  }

  removeAttack(id: string): void {
    this.attacks.delete(id);
  }

  clear(): void {
    this.attacks.clear();
  }
}
