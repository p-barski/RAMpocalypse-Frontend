import { Time } from './interfaces/time';

export class GameTime implements Time {
  frameTimestamp = 0;
  deltaTime = 0;
  averageFrameTime = 0;
  private readonly DELTAS_SIZE = 100;
  private readonly deltas = new Float32Array(this.DELTAS_SIZE);
  private deltaCounter = 0;

  constructor() {
    this.update();
  }

  update(): void {
    const currentTime = Date.now();
    this.deltaTime = (currentTime - this.frameTimestamp) / 1000;
    this.frameTimestamp = currentTime;
    this.deltas[this.deltaCounter] = this.deltaTime;
    this.deltaCounter = (this.deltaCounter + 1) % this.DELTAS_SIZE;
    this.averageFrameTime = this.deltas.reduce((sum, current) => sum + current, 0) / this.DELTAS_SIZE;
  }
}
