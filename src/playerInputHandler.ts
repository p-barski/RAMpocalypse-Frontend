import { InputHandler, AttackInputCallback } from './interfaces/inputHandler';
import { ViewportManager } from './interfaces/viewportManager';

/**
 * Handles keyboard and mouse input for the game.
 * Tracks key states and mouse position, converting mouse coordinates to game world coordinates.
 * Also handles attack input events via a callback mechanism.
 */
export class PlayerInputHandler implements InputHandler {
  private readonly canvas: HTMLCanvasElement;
  private readonly viewportManager: ViewportManager;
  private readonly keys: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;

  // Attack callback for notifying when attack keys are pressed
  private attackCallback: AttackInputCallback | null = null;

  // Bound event handlers for proper cleanup
  private readonly boundKeyDown: (e: KeyboardEvent) => void;
  private readonly boundKeyUp: (e: KeyboardEvent) => void;
  private readonly boundMouseMove: (e: MouseEvent) => void;
  private readonly boundClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, viewportManager: ViewportManager) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;

    // Bind event handlers to preserve 'this' context
    this.boundKeyDown = this.handleKeyDown;
    this.boundKeyUp = this.handleKeyUp;
    this.boundMouseMove = this.handleMouseMove;
    this.boundClick = this.handleClick;
  }

  setAttackCallback(callback: AttackInputCallback | null): void {
    this.attackCallback = callback;
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

  getMouseX(): number {
    return this.mouseX;
  }

  getMouseY(): number {
    return this.mouseY;
  }

  setup(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('click', this.boundClick);
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('click', this.boundClick);
    this.keys.clear();
    this.attackCallback = null;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());

    // Handle attack inputs
    if (this.attackCallback) {
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        this.attackCallback('melee');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        this.attackCallback('projectile');
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        this.attackCallback('special');
      }
    }
  };

  private handleClick = (_e: MouseEvent): void => {
    if (this.attackCallback) {
      this.attackCallback('melee');
    }
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
    const viewportRelativeX = canvasX - this.viewportManager.getViewportX();
    const viewportRelativeY = canvasY - this.viewportManager.getViewportY();

    // Convert to game world coordinates
    this.mouseX = viewportRelativeX / this.viewportManager.getScaleX();
    this.mouseY = viewportRelativeY / this.viewportManager.getScaleY();
  };
}
