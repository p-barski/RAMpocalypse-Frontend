import { expect, describe, it, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import './testHelpers/mockServer';
import { cleanup, type RenderAppResult, renderApp } from './testHelpers/renderApp';
import { loadSettings, SETTINGS_STORAGE_KEY } from './gameSettings';

function openSettings(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
}

function closeSettings(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
}

function settingsOverlay(): HTMLElement {
  const overlay = document.querySelector('.settings-overlay');
  if (!overlay) {
    throw new Error('Settings overlay is not open');
  }
  return overlay as HTMLElement;
}

function getMasterVolumeSlider(): HTMLInputElement {
  const audio = settingsOverlay().querySelector('.settings-audio')!;
  return audio.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
}

function getMuteCheckbox(): HTMLInputElement {
  return settingsOverlay().querySelector('.settings-mute-row input[type="checkbox"]') as HTMLInputElement;
}

function getDashRow(): HTMLElement {
  const rows = settingsOverlay().querySelectorAll('.settings-control-row');
  for (const row of rows) {
    if (row.querySelector('.settings-control-label')?.textContent === 'Dash') {
      return row as HTMLElement;
    }
  }
  throw new Error('Dash control row not found');
}

function removeDashKeyChip(keyLabel: string): void {
  const row = getDashRow();
  const chips = row.querySelectorAll('.settings-key-chip');
  for (const chip of chips) {
    if (chip.querySelector('.settings-key-label')?.textContent === keyLabel) {
      fireEvent.click(chip.querySelector('.settings-key-remove')!);
      return;
    }
  }
  throw new Error(`Dash key chip "${keyLabel}" not found`);
}

function dashKeyChipLabels(): string[] {
  return [...getDashRow().querySelectorAll('.settings-key-label')].map((el) => el.textContent ?? '');
}

describe('Settings integration', () => {
  let app: RenderAppResult;

  afterEach(() => {
    if (app) cleanup(app);
  });

  it('persists master volume across close and reopen', async () => {
    app = await renderApp();
    openSettings();

    const slider = getMasterVolumeSlider();
    fireEvent.change(slider, { target: { value: '42' } });
    expect(slider).toHaveValue('42');

    closeSettings();
    openSettings();

    expect(getMasterVolumeSlider()).toHaveValue('42');

    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!);
    expect(stored.audio.masterVolume).toBe(0.42);
    expect(loadSettings().audio.masterVolume).toBe(0.42);
  });

  it('persists mute toggle across close and reopen', async () => {
    app = await renderApp();
    openSettings();

    const mute = getMuteCheckbox();
    expect(mute).not.toBeChecked();
    fireEvent.click(mute);
    expect(mute).toBeChecked();

    closeSettings();
    openSettings();

    expect(getMuteCheckbox()).toBeChecked();
    expect(loadSettings().audio.muted).toBe(true);
  });

  it('persists removing secondary dash key across close and reopen', async () => {
    app = await renderApp();
    openSettings();

    expect(dashKeyChipLabels()).toEqual(expect.arrayContaining(['Space', 'Shift']));
    removeDashKeyChip('Shift');
    expect(dashKeyChipLabels()).toEqual(['Space']);

    closeSettings();
    openSettings();

    expect(dashKeyChipLabels()).toEqual(['Space']);
    expect(loadSettings().controls.dash).toEqual([' ']);
  });

  it('closes the overlay when Escape is pressed', async () => {
    app = await renderApp();
    openSettings();
    expect(document.querySelector('.settings-overlay')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(document.querySelector('.settings-overlay')).not.toBeInTheDocument();
  });
});
