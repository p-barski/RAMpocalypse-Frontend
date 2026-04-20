import type { Position } from './messageInterfaces';

export interface MovementController {
  update(): void;
  dash(): void;
  onPositionCorrected(position: Position): void;
  resetPositionTracking(): void;
}
