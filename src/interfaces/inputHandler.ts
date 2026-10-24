import type { AttackType } from './messageInterfaces';
export type AttackInputCallback = (attackType: AttackType) => void;
export type DashInputCallback = () => void;
export type SwitchArmInputCallback = () => void;

export interface InputHandler {
  isUpPressed(): boolean;
  isDownPressed(): boolean;
  isLeftPressed(): boolean;
  isRightPressed(): boolean;
  isRotateLeftPressed(): boolean;
  isRotateRightPressed(): boolean;
  setup(
    attackCallback: AttackInputCallback,
    dashCallback: DashInputCallback,
    switchArmCallback: SwitchArmInputCallback,
  ): void;
  cleanup(): void;
}
