import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from './gameStateManager';

describe('GameStateManager', () => {
  let sut: GameStateManager;

  beforeEach(() => {
    sut = new GameStateManager();
  });

  describe('death time tracking', () => {
    it('returns undefined when no death time was recorded', () => {
      expect(sut.getPlayerDeathTime('p1')).toBeUndefined();
    });

    it('records and returns a player death time', () => {
      sut.setPlayerDeathTime('p1', 1234);

      expect(sut.getPlayerDeathTime('p1')).toBe(1234);
    });

    it('clears a death time when set to undefined', () => {
      sut.setPlayerDeathTime('p1', 1234);

      sut.setPlayerDeathTime('p1', undefined);

      expect(sut.getPlayerDeathTime('p1')).toBeUndefined();
    });

    it('clears death time when the player is removed', () => {
      sut.setPlayerDeathTime('p1', 1234);

      sut.removePlayer('p1');

      expect(sut.getPlayerDeathTime('p1')).toBeUndefined();
    });

    it('clears all death times on reset', () => {
      sut.setPlayerDeathTime('p1', 1234);
      sut.setPlayerDeathTime('p2', 5678);

      sut.reset();

      expect(sut.getPlayerDeathTime('p1')).toBeUndefined();
      expect(sut.getPlayerDeathTime('p2')).toBeUndefined();
    });
  });
});
