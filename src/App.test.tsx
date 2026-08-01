import { expect, vi, describe, beforeEach, afterEach, type Mock, it } from 'vitest';
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
import gameConfig from '../public/gameconfig.json';

describe('App tests', () => {
  let connectMock: Mock<() => Promise<void>>;
  let gameMock: MockGameApi;

  beforeEach(() => {
    vi.clearAllMocks();
    connectMock = vi.fn(async () => {});
    gameMock = createMockGameApi({ connect: connectMock });
    (createGame as Mock).mockReturnValue(gameMock);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(gameConfig))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects to the game', async () => {
    render(<App />);
    await waitFor(() => {
      expect(createGame).toHaveBeenCalled();
      expect(connectMock).toHaveBeenCalled();
    });
  });

  it('renders mocked Chat', () => {
    render(<App />);
    expect(screen.getByTestId('mock-chat')).toBeInTheDocument();
  });

  it('shows settings overlay when Settings is clicked', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.settings-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(container.querySelector('.settings-overlay')).toBeInTheDocument();
  });
});
