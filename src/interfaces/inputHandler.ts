export type AttackInputType = 'melee' | 'projectile' | 'special';
export type AttackInputCallback = (attackType: AttackInputType) => void;

export interface InputHandler {
  isKeyPressed(key: string): boolean;
  isUpPressed(): boolean;
  isDownPressed(): boolean;
  isLeftPressed(): boolean;
  isRightPressed(): boolean;
  getMouseX(): number;
  getMouseY(): number;
  setup(): void;
  cleanup(): void;
  setAttackCallback(callback: AttackInputCallback | null): void;
}
