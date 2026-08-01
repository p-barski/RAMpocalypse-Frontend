import { useState, type RefObject } from 'react';
import { saveSettings, setPlayerName as setPlayerName, type GameSettings } from './gameSettings';
import type { Game } from './game';
import { sanitizePlayerName } from './utils';
import './NamePrompt.css';

export interface NamePromptProps {
  settings: GameSettings;
  gameRef: RefObject<Game | null>;
  maxNameLength?: number;
}

function NamePrompt({ settings, gameRef, maxNameLength }: NamePromptProps) {
  const [open, setOpen] = useState(!settings.playerName);
  const [value, setValue] = useState('');

  if (!open) return null;

  const applyName = (name: string) => {
    setPlayerName(settings, name);
    saveSettings(settings);
    gameRef.current?.setPlayerName(name);
    setOpen(false);
  };

  const handleSave = () => {
    const name = sanitizePlayerName(value, maxNameLength);
    if (!name) return;
    applyName(name);
  };

  return (
    <div className="name-prompt-overlay">
      <div className="name-prompt-panel">
        <h2>Welcome!</h2>
        <p>Pick a name to use in chat. You can change it later in Settings.</p>
        <input
          type="text"
          maxLength={maxNameLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="Enter a name..."
          autoFocus
        />
        <div className="name-prompt-actions">
          <button type="button" className="game-button" onClick={() => setOpen(false)}>
            Skip
          </button>
          <button type="button" className="game-button" onClick={handleSave} disabled={!value.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default NamePrompt;
