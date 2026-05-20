import { expect, vi, describe, beforeEach, type Mock, it, afterEach } from 'vitest';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';

vi.mock('./createGame', () => ({
  createGame: vi.fn(),
}));
vi.mock('./Chat', () => ({
  default: () => <div data-testid="mock-chat">Mocked Chat</div>,
}));

import App from './App';
import { createGame } from './createGame';
import { createMockGameApi, type MockGameApi } from './testHelpers/mocks';

describe('App integration', () => {
  let gameMock: MockGameApi;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    gameMock = createMockGameApi();
    (createGame as Mock).mockResolvedValue(gameMock);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not reinitialize the game when settings are opened and closed', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(createGame).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(container.querySelector('.settings-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(container.querySelector('.settings-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(createGame).toHaveBeenCalledTimes(1);
    expect(gameMock.stop).not.toHaveBeenCalled();
  });
});
