import type { InputHandler, AttackInputCallback } from './interfaces/inputHandler';
import type { ViewportManager } from './interfaces/viewportManager';
import { AttackTypeValue } from './messageInterfaces';

export class PlayerInputHandler implements InputHandler {
  public mouseX = 0;
  public mouseY = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly viewportManager: ViewportManager;
  private readonly keys: Set<string> = new Set();
  private attackCallback: AttackInputCallback;

  constructor(canvas: HTMLCanvasElement, viewportManager: ViewportManager) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;
    this.attackCallback = (_) => {};
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isUpPressed(): boolean {
    return this.keys.has('w') || this.keys.has('arrowup');
  }

  isDownPressed(): boolean {
    return this.keys.has('s') || this.keys.has('arrowdown');
  }

  isLeftPressed(): boolean {
    return this.keys.has('a') || this.keys.has('arrowleft');
  }

  isRightPressed(): boolean {
    return this.keys.has('d') || this.keys.has('arrowright');
  }

  setup(attackCallback: AttackInputCallback): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.attackCallback = attackCallback;
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    this.keys.clear();
    this.attackCallback = (_) => {};
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());

    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      this.attackCallback(AttackTypeValue.Melee);
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      this.attackCallback(AttackTypeValue.Projectile);
    } else if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      this.attackCallback(AttackTypeValue.Special);
    }
  };

  private handleClick = (_e: MouseEvent): void => {
    this.attackCallback(AttackTypeValue.Melee);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();

    // Convert to canvas coordinates
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to viewport-relative coordinates
    const viewportRelativeX = canvasX - this.viewportManager.viewportX;
    const viewportRelativeY = canvasY - this.viewportManager.viewportY;

    // Convert to game world coordinates
    this.mouseX = viewportRelativeX / this.viewportManager.scale;
    this.mouseY = viewportRelativeY / this.viewportManager.scale;
  };
}
