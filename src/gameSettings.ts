import { clamp } from './mathUtils';

export const SETTINGS_STORAGE_KEY = 'rampocalypse-settings';

export const SETTINGS_VERSION = 1 as const;

export const CONTROL_BINDING_KEYS = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'rotateLeft',
  'rotateRight',
  'dash',
  'projectileAttack',
  'specialAttack',
  'meleeAttack',
] as const;

export type ControlBindingKey = (typeof CONTROL_BINDING_KEYS)[number];
export type ControlBindings = Record<ControlBindingKey, string[]>;

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export interface GameSettings {
  version: typeof SETTINGS_VERSION;
  controls: ControlBindings;
  audio: AudioSettings;
  playerName: string;
}

const DEFAULT_CONTROLS: ControlBindings = {
  moveUp: ['w'],
  moveDown: ['s'],
  moveLeft: ['a'],
  moveRight: ['d'],
  rotateLeft: ['arrowleft'],
  rotateRight: ['arrowright'],
  dash: [' ', 'shift'],
  projectileAttack: ['e'],
  specialAttack: ['q'],
  meleeAttack: ['f'],
};

const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 1,
  sfxVolume: 1,
  musicVolume: 1,
  muted: false,
};

export const DEFAULT_PLAYER_NAME = '';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  version: SETTINGS_VERSION,
  controls: { ...DEFAULT_CONTROLS },
  audio: { ...DEFAULT_AUDIO },
  playerName: DEFAULT_PLAYER_NAME,
};

export function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function normalizeKeyArray(keys: unknown, fallback: string[]): string[] {
  if (!Array.isArray(keys)) {
    return [...fallback];
  }

  const normalized = keys.filter((key): key is string => typeof key === 'string' && key.length > 0).map(normalizeKey);

  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : [...fallback];
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return clamp(value, 0, 1);
}

function normalizeControls(controls: unknown): ControlBindings {
  const partial = (controls ?? {}) as Partial<Record<ControlBindingKey, unknown>>;
  const normalized = {} as ControlBindings;

  for (const action of CONTROL_BINDING_KEYS) {
    normalized[action] = normalizeKeyArray(partial[action], DEFAULT_CONTROLS[action]);
  }

  return normalized;
}

function normalizeAudio(audio: unknown): AudioSettings {
  const partial = (audio ?? {}) as Partial<AudioSettings>;

  return {
    masterVolume: clampVolume(partial.masterVolume, DEFAULT_AUDIO.masterVolume),
    sfxVolume: clampVolume(partial.sfxVolume, DEFAULT_AUDIO.sfxVolume),
    musicVolume: clampVolume(partial.musicVolume, DEFAULT_AUDIO.musicVolume),
    muted: typeof partial.muted === 'boolean' ? partial.muted : DEFAULT_AUDIO.muted,
  };
}

function normalizePlayerName(playerName: unknown): string {
  if (typeof playerName !== 'string') {
    return DEFAULT_PLAYER_NAME;
  }
  return playerName.trim();
}

export function normalizeGameSettings(raw: unknown): GameSettings {
  const partial = (raw ?? {}) as Partial<GameSettings>;

  return {
    version: SETTINGS_VERSION,
    controls: normalizeControls(partial.controls),
    audio: normalizeAudio(partial.audio),
    playerName: normalizePlayerName(partial.playerName),
  };
}

export function loadSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return normalizeGameSettings(JSON.parse(stored));
    }
  } catch (error) {
    console.warn('Error loading settings', error);
  }
  return normalizeGameSettings(DEFAULT_GAME_SETTINGS);
}

export function saveSettings(settings: GameSettings): void {
  const normalized = normalizeGameSettings(settings);
  const stringified = JSON.stringify(normalized);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, stringified);
  } catch (error) {
    console.warn('Error saving settings', error);
  }
}

export function isKeyGloballyBound(key: string, controls: ControlBindings, excludeAction?: ControlBindingKey): boolean {
  const normalized = normalizeKey(key);

  for (const action of CONTROL_BINDING_KEYS) {
    if (action === excludeAction) {
      continue;
    }
    if (controls[action].some((bound) => normalizeKey(bound) === normalized)) {
      return true;
    }
  }

  return false;
}

export function addControlKey(settings: GameSettings, action: ControlBindingKey, key: string): boolean {
  const normalized = normalizeKey(key);
  if (isKeyGloballyBound(normalized, settings.controls)) {
    return false;
  }
  settings.controls[action].push(normalized);
  return true;
}

export function removeControlKey(settings: GameSettings, action: ControlBindingKey, key: string): boolean {
  const bindings = settings.controls[action];
  if (bindings.length <= 1) {
    return false;
  }
  settings.controls[action] = bindings.filter((bound) => bound !== key);
  return true;
}

export function setAudioSetting<K extends keyof AudioSettings>(
  settings: GameSettings,
  field: K,
  value: AudioSettings[K],
): void {
  settings.audio[field] = value;
}

export function setPlayerName(settings: GameSettings, playerName: string): void {
  settings.playerName = normalizePlayerName(playerName);
}
