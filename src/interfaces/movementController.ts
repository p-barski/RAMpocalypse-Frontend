import type { Position } from './messageInterfaces';

export interface MovementController {
  update(): void;
  dash(): void;
  getDashCooldownRemaining(): number;
  onPositionCorrected(position: Position): void;
  resetPositionTracking(): void;
}
