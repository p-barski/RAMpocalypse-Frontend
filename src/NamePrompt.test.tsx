import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NamePrompt from './NamePrompt';
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings, SETTINGS_STORAGE_KEY } from './gameSettings';
import type { Game } from './game';

function createSettings(playerName = '') {
  return normalizeGameSettings({ ...DEFAULT_GAME_SETTINGS, playerName });
}

describe('NamePrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows on first launch when no player name is set', () => {
    render(<NamePrompt settings={createSettings()} gameRef={createRef<Game | null>()} maxNameLength={20} />);

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('does not show when a player name is already saved', () => {
    render(<NamePrompt settings={createSettings('Alice')} gameRef={createRef<Game | null>()} maxNameLength={20} />);

    expect(screen.queryByText('Welcome!')).not.toBeInTheDocument();
  });

  it('saves a sanitized name, persists it, and notifies the game', () => {
    const settings = createSettings();
    const gameRef = { current: { setPlayerName: vi.fn() } as unknown as Game };
    render(<NamePrompt settings={settings} gameRef={gameRef} maxNameLength={20} />);

    fireEvent.change(screen.getByPlaceholderText('Enter a name...'), { target: { value: '  Bob  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(settings.playerName).toBe('Bob');
    expect(gameRef.current!.setPlayerName).toHaveBeenCalledWith('Bob');
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).playerName).toBe('Bob');
    expect(screen.queryByText('Welcome!')).not.toBeInTheDocument();
  });

  it('truncates the name to maxNameLength before saving', () => {
    const settings = createSettings();
    render(<NamePrompt settings={settings} gameRef={createRef<Game | null>()} maxNameLength={5} />);

    fireEvent.change(screen.getByPlaceholderText('Enter a name...'), { target: { value: 'Alexandria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(settings.playerName).toBe('Alexa');
  });

  it('censors profanity before saving', () => {
    const settings = createSettings();
    render(<NamePrompt settings={settings} gameRef={createRef<Game | null>()} maxNameLength={20} />);

    fireEvent.change(screen.getByPlaceholderText('Enter a name...'), { target: { value: 'fuck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(settings.playerName).not.toBe('fuck');
  });

  it('closes without saving when Skip is clicked', () => {
    const settings = createSettings();
    render(<NamePrompt settings={settings} gameRef={createRef<Game | null>()} maxNameLength={20} />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(settings.playerName).toBe('');
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText('Welcome!')).not.toBeInTheDocument();
  });

  it('disables Save while the input is empty or whitespace-only', () => {
    render(<NamePrompt settings={createSettings()} gameRef={createRef<Game | null>()} maxNameLength={20} />);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Enter a name...'), { target: { value: '   ' } });
    expect(saveButton).toBeDisabled();
  });
});
