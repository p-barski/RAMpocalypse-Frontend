import { render, waitFor, type RenderResult } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { cancelPendingAnimationFrames } from '../setupIntegrationTests';
import { createMockServer, type MockServer } from './mockServer';
import type { ChatMessageServer } from '../interfaces/messageInterfaces';
import App from '../App';

export interface RenderAppOptions {
  serverUrl?: string;
  chatHistory?: ChatMessageServer[];
  chatHistoryStatus?: number;
}

export interface RenderAppResult {
  renderResult: RenderResult;
  mockServer: MockServer;
}

export async function renderApp(options: RenderAppOptions = {}): Promise<RenderAppResult> {
  const serverUrl = options.serverUrl ?? 'http://localhost:5027';
  localStorage.clear();

  const mockServer = createMockServer(serverUrl);
  if (options.chatHistory !== undefined) {
    mockServer.chatHistory = options.chatHistory;
  }
  if (options.chatHistoryStatus !== undefined) {
    mockServer.chatHistoryStatus = options.chatHistoryStatus;
  }
  vi.stubEnv('VITE_SERVER_URL', serverUrl);

  const renderResult = render(<App />);

  await waitFor(() => {
    expect(document.querySelector('canvas')).toBeInTheDocument();
    expect(window.game).toBeTruthy();
    expect(mockServer.hub.startSpy).toHaveBeenCalled();
  });
  return { renderResult, mockServer };
}

export function cleanup({ renderResult, mockServer }: RenderAppResult): void {
  renderResult.unmount();
  cancelPendingAnimationFrames();
  window.game = null;
  mockServer.uninstall();
  vi.unstubAllEnvs();
}
