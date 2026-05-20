export type AudioCategory = 'sfx' | 'music';

export interface AudioController {
  playShortRunningSound(sound: string, volume?: number, category?: AudioCategory): Promise<void>;
  playLongRunningSound(sound: string, volume?: number, category?: AudioCategory): Promise<void>;
  stopSound(sound: string): Promise<void>;
  cleanup(): void;
}
