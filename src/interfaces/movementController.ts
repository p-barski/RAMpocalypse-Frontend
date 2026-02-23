import { Position } from '../messageInterfaces';

export interface MovementController {
  update(deltaTime: number, currentFrameTime: number): void;
  onPositionCorrected(position: Position): void;
  resetPositionTracking(): void;
}
