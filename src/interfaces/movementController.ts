import { Position } from '../messageInterfaces';

export interface MovementController {
  update(deltaTime: number): void;
  sendPositionUpdate(position: Position): Promise<void>;
  getSpeed(): number;
  setSpeed(speed: number): void;
  onPositionCorrected(position: Position): void;
  resetPositionTracking(): void;
}
