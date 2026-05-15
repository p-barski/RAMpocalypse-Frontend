import type { InputHandler, AttackInputCallback, DashInputCallback } from './interfaces/inputHandler';
import { AttackTypeValue } from './interfaces/messageInterfaces';

export class PlayerInputHandler implements InputHandler {
  private readonly canvas: HTMLCanvasElement;
  private readonly keys: Set<string> = new Set();
  private attackCallback: AttackInputCallback;
  private dashCallback: DashInputCallback;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.attackCallback = (_) => {};
    this.dashCallback = () => {};
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isUpPressed(): boolean {
    return this.keys.has('w');
  }

  isDownPressed(): boolean {
    return this.keys.has('s');
  }

  isLeftPressed(): boolean {
    return this.keys.has('a');
  }

  isRightPressed(): boolean {
    return this.keys.has('d');
  }

  isRotateLeftPressed(): boolean {
    return this.keys.has('arrowleft');
  }

  isRotateRightPressed(): boolean {
    return this.keys.has('arrowright');
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

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target !== this.canvas) return;
    const keyLower = e.key.toLowerCase();
    this.keys.add(keyLower);

    switch (keyLower) {
      case ' ':
      case 'shift':
        this.dashCallback();
        break;
      case 'e':
        this.attackCallback(AttackTypeValue.Projectile);
        break;
      case 'q':
        this.attackCallback(AttackTypeValue.Special);
    }
  };

  private handleClick = (_e: MouseEvent): void => {
    this.attackCallback(AttackTypeValue.Melee);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };
}
