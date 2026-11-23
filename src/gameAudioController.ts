import type { AudioCategory, AudioController } from './interfaces/audioController';
import type { AudioSettings } from './gameSettings';

export class GameAudioController implements AudioController {
  private readonly settings: AudioSettings;
  private readonly audioContext = new AudioContext();
  private readonly masterGain = this.audioContext.createGain();
  private readonly categoryGains: Record<AudioCategory, GainNode> = {
    music: this.audioContext.createGain(),
    sfx: this.audioContext.createGain(),
  };
  private readonly audioCache: Map<string, AudioBuffer> = new Map();
  private readonly longRunningSounds: Map<string, AudioBufferSourceNode> = new Map();

  constructor(settings: AudioSettings) {
    this.settings = settings;
    this.masterGain.connect(this.audioContext.destination);
    this.categoryGains.music.connect(this.masterGain);
    this.categoryGains.sfx.connect(this.masterGain);
    this.settingsUpdated();
  }

  async playShortRunningSound(sound: string, volume = 1, category: AudioCategory = 'sfx'): Promise<void> {
    const cached = this.audioCache.get(sound);
    if (cached) {
      this.playAudioBuffer(cached, volume, category);
      return;
    }
    await this.fetchAudioAndPlay(sound, false, volume, category);
  }

  async playLongRunningSound(sound: string, volume = 1, category: AudioCategory = 'sfx'): Promise<void> {
    const cached = this.audioCache.get(sound);
    if (cached) {
      const source = this.playAudioBuffer(cached, volume, category);
      source.loop = true;
      this.longRunningSounds.set(sound, source);
      return;
    }
    await this.fetchAudioAndPlay(sound, true, volume, category);
  }

  async stopSound(sound: string): Promise<void> {
    const source = this.longRunningSounds.get(sound);
    if (source) {
      source.stop();
      this.longRunningSounds.delete(sound);
    } else {
      console.warn(`Trying to stop sound that is not running: ${sound}`);
    }
  }

  cleanup(): void {
    this.longRunningSounds.forEach((source) => source.stop());
    this.longRunningSounds.clear();
  }
  settingsUpdated(): void {
    const now = this.audioContext.currentTime;
    const { muted, masterVolume, musicVolume, sfxVolume } = this.settings;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : masterVolume, now, 0);
    this.categoryGains.music.gain.setTargetAtTime(musicVolume, now, 0);
    this.categoryGains.sfx.gain.setTargetAtTime(sfxVolume, now, 0);
  }

  private async fetchAudioAndPlay(
    sound: string,
    longRunning: boolean,
    volume: number,
    category: AudioCategory,
  ): Promise<void> {
    const response = await fetch(sound);
    if (!response.ok) {
      console.warn(`Failed to load audio: ${sound}; response status: ${response.status}`);
      return;
    }
    let buffer: AudioBuffer;
    try {
      buffer = await this.audioContext.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      console.warn(`Couldn't decode audio: ${sound}`, error);
      return;
    }
    this.audioCache.set(sound, buffer);
    const source = this.playAudioBuffer(buffer, volume, category);
    if (longRunning) {
      source.loop = true;
      this.longRunningSounds.set(sound, source);
    }
  }

  private playAudioBuffer(buffer: AudioBuffer, volume: number, category: AudioCategory) {
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.categoryGains[category]);
    source.start();
    return source;
  }
}
