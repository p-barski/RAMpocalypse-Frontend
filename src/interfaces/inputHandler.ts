import type { AttackType } from './messageInterfaces';
export type AttackInputCallback = (attackType: AttackType) => void;
export type DashInputCallback = () => void;

export interface InputHandler {
  readonly mouseX: number;
  readonly mouseY: number;
  isKeyPressed(key: string): boolean;
  isUpPressed(): boolean;
  isDownPressed(): boolean;
  isLeftPressed(): boolean;
  isRightPressed(): boolean;
  setup(attackCallback: AttackInputCallback, dashCallback: DashInputCallback): void;
  cleanup(): void;
}
