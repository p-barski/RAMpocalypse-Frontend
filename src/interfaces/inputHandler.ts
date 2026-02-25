export type AttackInputType = 'melee' | 'projectile' | 'special';
export type AttackInputCallback = (attackType: AttackInputType) => void;

export interface InputHandler {
  readonly mouseX: number;
  readonly mouseY: number;
  isKeyPressed(key: string): boolean;
  isUpPressed(): boolean;
  isDownPressed(): boolean;
  isLeftPressed(): boolean;
  isRightPressed(): boolean;
  setup(attackCallback: AttackInputCallback): void;
  cleanup(): void;
}
