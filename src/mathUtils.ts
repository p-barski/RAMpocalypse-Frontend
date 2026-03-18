import type { Position } from './interfaces/messageInterfaces';

export const HALF_PI = Math.PI / 2;
export const TAU = Math.PI * 2;

export function calculateDirectionVector(position: Position): Position {
  const x = Math.sin(position.angle);
  const y = -Math.cos(position.angle);
  return { x, y, angle: position.angle } satisfies Position;
}
