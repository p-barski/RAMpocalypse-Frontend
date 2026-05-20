import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  SETTINGS_STORAGE_KEY,
  isKeyGloballyBound,
  loadSettings,
  normalizeGameSettings,
  saveSettings,
} from './gameSettings';

describe('gameSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('defaults', () => {
    it('returns defaults when localStorage is empty', () => {
      expect(loadSettings()).toEqual(DEFAULT_GAME_SETTINGS);
    });
  });

  describe('normalizeGameSettings', () => {
    it('normalizes control key casing and drops invalid entries', () => {
      const result = normalizeGameSettings({
        controls: {
          moveUp: ['W', '', 42, 'ArrowUp'],
          moveDown: ['s'],
        },
        audio: {
          masterVolume: 2,
          sfxVolume: -0.5,
          musicVolume: 'incorrect',
          muted: 'incorrect',
        },
      });

      expect(result.controls.moveUp).toEqual(['w', 'arrowup']);
      expect(result.controls.moveDown).toEqual(['s']);
      expect(result.controls.moveLeft).toEqual(['a']);
      expect(result.audio.masterVolume).toBe(1);
      expect(result.audio.sfxVolume).toBe(0);
      expect(result.audio.musicVolume).toBe(1);
      expect(result.audio.muted).toBe(false);
    });

    it('falls back to default keys when an action has no valid keys', () => {
      const result = normalizeGameSettings({
        controls: { dash: [] },
      });

      expect(result.controls.dash).toEqual([' ', 'shift']);
    });

    it('deduplicates keys within an action', () => {
      const result = normalizeGameSettings({
        controls: { moveUp: ['w', 'W', 'w'] },
      });

      expect(result.controls.moveUp).toEqual(['w']);
    });
  });

  describe('save and load', () => {
    it('saves and loads settings via localStorage', () => {
      const custom = normalizeGameSettings({
        controls: {
          moveUp: ['arrowup', 'w'],
          dash: ['control'],
        },
        audio: {
          masterVolume: 0.5,
          sfxVolume: 0.25,
          musicVolume: 0.75,
          muted: true,
        },
      });

      saveSettings(custom);
      expect(loadSettings()).toEqual(custom);
      expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(custom));
    });

    it('returns defaults when stored JSON is invalid', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');
      expect(loadSettings()).toEqual(DEFAULT_GAME_SETTINGS);
    });

    it('returns defaults when JSON.parse throws', () => {
      const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
        throw new Error('parse failed');
      });
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{"version":1}');

      expect(loadSettings()).toEqual(DEFAULT_GAME_SETTINGS);

      parseSpy.mockRestore();
    });
  });

  describe('global duplicate-key helpers', () => {
    it('detects keys bound on other actions', () => {
      const controls = { ...DEFAULT_GAME_SETTINGS.controls };
      expect(isKeyGloballyBound('w', controls)).toBe(true);
      expect(isKeyGloballyBound('w', controls, 'moveUp')).toBe(false);
      expect(isKeyGloballyBound('x', controls)).toBe(false);
    });

    it('treats keys case-insensitively for duplicate detection', () => {
      const controls = { ...DEFAULT_GAME_SETTINGS.controls };
      expect(isKeyGloballyBound('W', controls, 'moveDown')).toBe(true);
    });
  });
});
