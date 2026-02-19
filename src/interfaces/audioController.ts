export interface AudioController {
  playShortRunningSound(sound: string, volume?: number): Promise<void>;
  playLongRunningSound(sound: string, volume?: number): Promise<void>;
  stopSound(sound: string): Promise<void>;
  cleanup(): void;
}
