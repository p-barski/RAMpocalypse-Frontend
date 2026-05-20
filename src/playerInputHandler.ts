import type { InputHandler, AttackInputCallback, DashInputCallback } from './interfaces/inputHandler';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import type { ControlBindings } from './gameSettings';

export class PlayerInputHandler implements InputHandler {
  private readonly canvas: HTMLCanvasElement;
  private readonly bindings: ControlBindings;
  private readonly keys: Set<string> = new Set();
  private attackCallback: AttackInputCallback;
  private dashCallback: DashInputCallback;

  constructor(canvas: HTMLCanvasElement, bindings: ControlBindings) {
    this.canvas = canvas;
    this.bindings = bindings;
    this.attackCallback = (_) => {};
    this.dashCallback = () => {};
  }

  isUpPressed(): boolean {
    return this.isAnyBound(this.bindings.moveUp);
  }

  isDownPressed(): boolean {
    return this.isAnyBound(this.bindings.moveDown);
  }

  isLeftPressed(): boolean {
    return this.isAnyBound(this.bindings.moveLeft);
  }

  isRightPressed(): boolean {
    return this.isAnyBound(this.bindings.moveRight);
  }

  isRotateLeftPressed(): boolean {
    return this.isAnyBound(this.bindings.rotateLeft);
  }

  isRotateRightPressed(): boolean {
    return this.isAnyBound(this.bindings.rotateRight);
  }

  setup(attackCallback: AttackInputCallback, dashCallback: DashInputCallback): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('click', this.handleClick);
    this.attackCallback = attackCallback;
    this.dashCallback = dashCallback;
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('click', this.handleClick);
    this.keys.clear();
    this.attackCallback = (_) => {};
    this.dashCallback = () => {};
  }

  private isAnyBound(keys: string[]): boolean {
    return keys.some((k) => this.keys.has(k));
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target !== this.canvas) return;
    const keyLower = e.key.toLowerCase();
    this.keys.add(keyLower);

    if (this.bindings.dash.includes(keyLower)) {
      this.dashCallback();
    }
    if (this.bindings.projectileAttack.includes(keyLower)) {
      this.attackCallback(AttackTypeValue.Projectile);
    }
    if (this.bindings.specialAttack.includes(keyLower)) {
      this.attackCallback(AttackTypeValue.Special);
    }
    if (this.bindings.meleeAttack.includes(keyLower)) {
      this.attackCallback(AttackTypeValue.Melee);
    }
  };

  private handleClick = (_e: MouseEvent): void => {
    this.attackCallback(AttackTypeValue.Melee);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };
}
