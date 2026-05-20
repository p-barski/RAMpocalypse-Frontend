import { useCallback, useEffect, useReducer, useState, type RefObject } from 'react';
import {
  addControlKey,
  CONTROL_BINDING_KEYS,
  removeControlKey,
  saveSettings,
  setAudioSetting,
  type ControlBindingKey,
  type GameSettings,
} from './gameSettings';
import './Settings.css';
import { capitalize } from './utils';

function keyToLabel(str: string): string {
  return capitalize(str.replace(/([A-Z])/g, ' $1').toLowerCase());
}

const CONTROL_BINDING_LABELS = Object.fromEntries(
  CONTROL_BINDING_KEYS.map((key) => {
    return [key, keyToLabel(key)];
  }),
) as Record<ControlBindingKey, string>;

function formatKeyLabel(key: string): string {
  switch (key) {
    case ' ':
      return 'Space';
    case 'arrowleft':
      return 'Arrow Left';
    case 'arrowright':
      return 'Arrow Right';
    case 'arrowup':
      return 'Arrow Up';
    case 'arrowdown':
      return 'Arrow Down';
    default: {
      if (key.length === 1) {
        return key.toUpperCase();
      }
      return capitalize(key);
    }
  }
}

export interface SettingsOverlayProps {
  settings: GameSettings;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  openSettingsRef: RefObject<() => void>;
}

function Settings({ settings, canvasRef, openSettingsRef }: SettingsOverlayProps) {
  const [open, setOpen] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [listeningAction, setListeningAction] = useState<ControlBindingKey | null>(null);

  const handleChange = useCallback((settings: GameSettings) => {
    saveSettings(settings);
  }, []);

  const handleClose = useCallback(() => {
    setListeningAction(null);
    setOpen(false);
    canvasRef.current?.focus();
  }, [canvasRef]);

  const persist = useCallback(() => {
    handleChange(settings);
    rerender();
  }, [handleChange, settings]);

  const removeKey = (action: ControlBindingKey, key: string) => {
    if (!removeControlKey(settings, action, key)) return;
    persist();
  };

  const setAudioField = <K extends keyof GameSettings['audio']>(field: K, value: GameSettings['audio'][K]) => {
    setAudioSetting(settings, field, value);
    persist();
  };

  useEffect(() => {
    openSettingsRef.current = () => {
      setOpen(true);
    };
    return () => {
      openSettingsRef.current = () => {};
    };
  }, [openSettingsRef]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!listeningAction) handleClose();
        return setListeningAction(null);
      }
      if (!listeningAction || !addControlKey(settings, listeningAction, e.key)) return;
      handleChange(settings);
      setListeningAction(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [listeningAction, settings, handleChange, handleClose, open]);

  if (!open) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="game-button settings-close" onClick={handleClose}>
            Close
          </button>
        </header>

        <section className="settings-section">
          <h3>Controls</h3>
          <div className="settings-controls">
            {CONTROL_BINDING_KEYS.map((action) => {
              const bindings = settings.controls[action];
              const isListening = listeningAction === action;

              return (
                <div className="settings-control-row" key={action}>
                  <span className="settings-control-label">{CONTROL_BINDING_LABELS[action]}</span>
                  <div className="settings-control-keys">
                    {bindings.map((key) => (
                      <span className="settings-key-chip" key={key}>
                        <span className="settings-key-label">{formatKeyLabel(key)}</span>
                        <button
                          type="button"
                          className="settings-key-remove"
                          disabled={bindings.length <= 1}
                          onClick={() => removeKey(action, key)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className={`game-button settings-add-key ${isListening ? 'listening' : ''}`}
                      disabled={listeningAction !== null && !isListening}
                      onClick={() => setListeningAction(isListening ? null : action)}
                    >
                      {isListening ? 'Press a key…' : 'Add key'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="settings-section">
          <h3>Audio</h3>
          <div className="settings-audio">
            <label className="settings-slider-row">
              <span>Master volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.audio.masterVolume * 100)}
                onChange={(e) => setAudioField('masterVolume', Number(e.target.value) / 100)}
              />
              <span className="settings-slider-value">{Math.round(settings.audio.masterVolume * 100)}%</span>
            </label>
            <label className="settings-slider-row">
              <span>Sound effects</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.audio.sfxVolume * 100)}
                onChange={(e) => setAudioField('sfxVolume', Number(e.target.value) / 100)}
              />
              <span className="settings-slider-value">{Math.round(settings.audio.sfxVolume * 100)}%</span>
            </label>
            <label className="settings-slider-row">
              <span>Music</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.audio.musicVolume * 100)}
                onChange={(e) => setAudioField('musicVolume', Number(e.target.value) / 100)}
              />
              <span className="settings-slider-value">{Math.round(settings.audio.musicVolume * 100)}%</span>
            </label>
            <label className="settings-mute-row">
              <input
                type="checkbox"
                checked={settings.audio.muted}
                onChange={(e) => setAudioField('muted', e.target.checked)}
              />
              <span>Mute all audio</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
