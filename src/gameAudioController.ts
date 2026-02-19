import { AudioController } from './interfaces/audioController';

export class GameAudioController implements AudioController {
  private readonly audioContext = new AudioContext();
  private readonly audioCache: Map<string, AudioBuffer> = new Map();
  private readonly longRunningSounds: Map<string, AudioBufferSourceNode> = new Map();

  async playShortRunningSound(sound: string, volume = 1): Promise<void> {
    const cached = this.audioCache.get(sound);
    if (cached) {
      this.playAudioBuffer(cached, volume);
      return;
    }
    await this.fetchAudioAndPlay(sound, false, volume);
  }

  async playLongRunningSound(sound: string, volume = 1): Promise<void> {
    const cached = this.audioCache.get(sound);
    if (cached) {
      const source = this.playAudioBuffer(cached, volume);
      source.loop = true;
      this.longRunningSounds.set(sound, source);
      return;
    }
    await this.fetchAudioAndPlay(sound, true, volume);
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

  private async fetchAudioAndPlay(sound: string, longRunning: boolean, volume: number): Promise<void> {
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
    const source = this.playAudioBuffer(buffer, volume);
    if (longRunning) {
      source.loop = true;
      this.longRunningSounds.set(sound, source);
    }
  }

  private playAudioBuffer(buffer: AudioBuffer, volume: number): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
    return source;
  }
}
