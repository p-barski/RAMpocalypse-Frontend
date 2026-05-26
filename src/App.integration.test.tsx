import { expect, describe, it, afterEach, vi, assert } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import './testHelpers/mockServer';
import { cleanup, type RenderAppResult, renderApp } from './testHelpers/renderApp';
import { DEFAULT_GAME_SETTINGS } from './gameSettings';
import gameConfig from '../public/gameconfig.json';
import { PlayerMovementController } from './playerMovementController';

function keyDownOnCanvas(canvas: HTMLCanvasElement, key: string): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  Object.defineProperty(event, 'target', { value: canvas });
  window.dispatchEvent(event);
}

describe('App integration tests', () => {
  let app: RenderAppResult;

  afterEach(() => {
    if (app) cleanup(app);
  });

  it('does not reinitialize the game when settings are opened and closed', async () => {
    app = await renderApp();

    const game = window.game!;
    const stopSpy = vi.spyOn(game, 'stop');

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(app.renderResult.container.querySelector('.settings-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(app.renderResult.container.querySelector('.settings-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(window.game).toBe(game);
    expect(app.mockServer.hub.startSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('calls dash on the server when direction and dash key is pressed', async () => {
    app = await renderApp();

    const game = window.game!;
    const canvas = document.querySelector('canvas');
    assert(canvas instanceof HTMLCanvasElement);
    expect(game.communicationService.isConnected()).toBe(true);
    expect(game.gameStateManager.isPlaying()).toBe(true);

    game.gameSession.isOnlineMatch = true;

    const dashSpeed = gameConfig.movementSpeed * gameConfig.dashSpeedMultiplier;
    keyDownOnCanvas(canvas, DEFAULT_GAME_SETTINGS.controls.moveLeft[0]);
    keyDownOnCanvas(canvas, DEFAULT_GAME_SETTINGS.controls.dash[0]);

    await waitFor(() => {
      expect(app.mockServer.hub.invokeSpy).toHaveBeenCalledWith('Dash', -dashSpeed, 0);
    });
  });

  it('cancels dash when server returns false', async () => {
    app = await renderApp();
    app.mockServer.hub.invokeHandler = (method) => (method === 'Dash' ? false : undefined);

    const game = window.game!;
    const canvas = document.querySelector('canvas');
    assert(canvas instanceof HTMLCanvasElement);
    game.gameSession.isOnlineMatch = true;

    const movementController = game.movementController as PlayerMovementController;
    const dashSpeed = gameConfig.movementSpeed * gameConfig.dashSpeedMultiplier;
    keyDownOnCanvas(canvas, DEFAULT_GAME_SETTINGS.controls.moveLeft[0]);
    keyDownOnCanvas(canvas, DEFAULT_GAME_SETTINGS.controls.dash[0]);

    await waitFor(() => {
      expect(app.mockServer.hub.invokeSpy).toHaveBeenCalledWith('Dash', -dashSpeed, 0);
      expect(movementController['isDashing']).toBe(false);
    });
  });
});
