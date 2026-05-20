import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerInputHandler } from './playerInputHandler';
import { AttackTypeValue } from './interfaces/messageInterfaces';
import type { AttackInputCallback, DashInputCallback } from './interfaces/inputHandler';
import type { ControlBindings } from './gameSettings';
import { DEFAULT_GAME_SETTINGS } from './gameSettings';

function createBindings(overrides: Partial<ControlBindings> = {}): ControlBindings {
  return { ...DEFAULT_GAME_SETTINGS.controls, ...overrides };
}

function keyEvent(type: 'keydown' | 'keyup', key: string, target: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent(type, { key, bubbles: true });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('PlayerInputHandler', () => {
  let sut: PlayerInputHandler;
  let canvas: HTMLCanvasElement;
  let attackCallback: ReturnType<typeof vi.fn<AttackInputCallback>>;
  let dashCallback: ReturnType<typeof vi.fn<DashInputCallback>>;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    attackCallback = vi.fn<AttackInputCallback>();
    dashCallback = vi.fn<DashInputCallback>();
  });

  afterEach(() => {
    sut?.cleanup();
    canvas.remove();
  });

  function setup(bindings?: ControlBindings) {
    sut = new PlayerInputHandler(canvas, bindings ?? createBindings());
    sut.setup(attackCallback, dashCallback);
  }

  function pressKey(key: string, target: EventTarget = canvas) {
    window.dispatchEvent(keyEvent('keydown', key, target));
  }

  function releaseKey(key: string) {
    window.dispatchEvent(keyEvent('keyup', key, canvas));
  }

  describe('movement and rotation', () => {
    it('detects movement when any bound key for that action is held', () => {
      setup(createBindings({ moveUp: ['w', 'arrowup'] }));

      pressKey('w');
      expect(sut.isUpPressed()).toBe(true);
      expect(sut.isDownPressed()).toBe(false);
      releaseKey('w');
      expect(sut.isUpPressed()).toBe(false);

      pressKey('ArrowUp');
      expect(sut.isUpPressed()).toBe(true);
      releaseKey('ArrowUp');
    });

    it('detects each movement and rotation direction from default bindings', () => {
      setup();

      pressKey('w');
      expect(sut.isUpPressed()).toBe(true);
      releaseKey('w');

      pressKey('s');
      expect(sut.isDownPressed()).toBe(true);
      releaseKey('s');

      pressKey('a');
      expect(sut.isLeftPressed()).toBe(true);
      releaseKey('a');

      pressKey('d');
      expect(sut.isRightPressed()).toBe(true);
      releaseKey('d');

      pressKey('ArrowLeft');
      expect(sut.isRotateLeftPressed()).toBe(true);
      releaseKey('ArrowLeft');

      pressKey('ArrowRight');
      expect(sut.isRotateRightPressed()).toBe(true);
      releaseKey('ArrowRight');
    });
  });

  describe('dash and attacks', () => {
    it('fires dash when a bound dash key is pressed on the canvas', () => {
      setup(createBindings({ dash: ['control'] }));

      pressKey('Control');
      expect(dashCallback).toHaveBeenCalledTimes(1);
      expect(attackCallback).not.toHaveBeenCalled();
    });

    it('fires attack callbacks for projectile, special, and melee keys', () => {
      setup(createBindings({ projectileAttack: ['e'], specialAttack: ['q'], meleeAttack: ['f'] }));

      pressKey('e');
      expect(attackCallback).toHaveBeenCalledWith(AttackTypeValue.Projectile);

      pressKey('q');
      expect(attackCallback).toHaveBeenCalledWith(AttackTypeValue.Special);

      pressKey('f');
      expect(attackCallback).toHaveBeenCalledWith(AttackTypeValue.Melee);
    });

    it('fires melee attack on canvas click', () => {
      setup();
      attackCallback.mockClear();

      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(attackCallback).toHaveBeenCalledWith(AttackTypeValue.Melee);
      expect(dashCallback).not.toHaveBeenCalled();
    });

    it('supports multiple dash keys', () => {
      setup(createBindings({ dash: [' ', 'shift'] }));

      pressKey(' ');
      expect(dashCallback).toHaveBeenCalledTimes(1);

      pressKey('Shift');
      expect(dashCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('canvas focus isolation', () => {
    it('ignores keydown when focus target is not the canvas', () => {
      setup();
      const input = document.createElement('input');
      document.body.appendChild(input);

      pressKey('w', input);
      expect(sut.isUpPressed()).toBe(false);
      expect(dashCallback).not.toHaveBeenCalled();
      expect(attackCallback).not.toHaveBeenCalled();

      input.remove();
    });
  });
});
