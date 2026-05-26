import { expect, describe, it, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import './testHelpers/mockServer';
import { cleanup, type RenderAppResult, renderApp } from './testHelpers/renderApp';
import { ChatMessageTypeValue, type ChatMessageServer } from './interfaces/messageInterfaces';

function createChatMessage(overrides: Partial<ChatMessageServer> = {}): ChatMessageServer {
  return {
    id: crypto.randomUUID(),
    text: 'text',
    type: ChatMessageTypeValue.Global,
    ownerId: crypto.randomUUID(),
    ownerName: 'owner',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function typeAndSend(message: string): void {
  const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
  fireEvent.change(input, { target: { value: message } });
  const sendButton = input.parentElement!.querySelector('button')!;
  fireEvent.click(sendButton);
}

function switchToLobbyChat(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Lobby chat' }));
}

function switchToGlobalChat(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Global chat' }));
}

describe('Chat integration tests', () => {
  let app: RenderAppResult;

  afterEach(() => {
    if (app) cleanup(app);
  });

  it('loads global chat history from the server', async () => {
    const firstMsgText = 'msgtext1';
    const firstMsgName = 'name1';
    const secondMsgText = 'Second history line';
    const secondMsgName = 'msgtext2';
    app = await renderApp({
      chatHistory: [
        createChatMessage({ text: firstMsgText, ownerName: firstMsgName }),
        createChatMessage({ text: secondMsgText, ownerName: secondMsgName }),
      ],
    });

    await waitFor(() => {
      expect(screen.getByText(firstMsgText)).toBeInTheDocument();
      expect(screen.getByText(secondMsgText)).toBeInTheDocument();
    });
    expect(screen.getByText(`${firstMsgName}:`)).toBeInTheDocument();
    expect(screen.getByText(`${secondMsgName}:`)).toBeInTheDocument();
  });

  it('shows a fallback message when chat history fetch fails', async () => {
    app = await renderApp({ chatHistoryStatus: 500 });

    await waitFor(() => {
      expect(screen.getByText('Could not load chat history.')).toBeInTheDocument();
    });
  });

  it('sends a message through the game to SignalR', async () => {
    app = await renderApp();
    const msgText = 'Hello integration';
    typeAndSend(msgText);

    await waitFor(() => {
      expect(app.mockServer.hub.invokeSpy).toHaveBeenCalledWith('SendMessage', msgText, ChatMessageTypeValue.Global);
    });
  });

  it('renders incoming hub messages in the UI', async () => {
    app = await renderApp();

    const msgText = 'incoming msg';
    const msgName = 'msgname';
    app.mockServer.hub.emit(
      'MessageReceived',
      createChatMessage({
        text: msgText,
        ownerName: msgName,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(msgText)).toBeInTheDocument();
      expect(screen.getByText(`${msgName}:`)).toBeInTheDocument();
    });
  });

  it('switches between Global and Lobby chat tabs', async () => {
    const msgTextGlobal = 'msgtext global';
    const msgTextLobby = 'msgtext lobby';
    const msgNameGlobal = 'name global';
    const msgNameLobby = 'name lobby';
    app = await renderApp({
      chatHistory: [createChatMessage({ text: msgTextGlobal, ownerName: msgNameGlobal })],
    });

    await waitFor(() => {
      expect(screen.getByText(msgTextGlobal)).toBeInTheDocument();
      expect(screen.getByText(`${msgNameGlobal}:`)).toBeInTheDocument();
    });

    switchToLobbyChat();
    expect(screen.queryByText(msgTextGlobal)).not.toBeInTheDocument();

    app.mockServer.hub.emit(
      'MessageReceived',
      createChatMessage({
        text: msgTextLobby,
        ownerName: msgNameLobby,
        type: ChatMessageTypeValue.Lobby,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(msgTextLobby)).toBeInTheDocument();
      expect(screen.getByText(`${msgNameLobby}:`)).toBeInTheDocument();
    });
    expect(screen.queryByText(msgTextGlobal)).not.toBeInTheDocument();

    switchToGlobalChat();
    await waitFor(() => {
      expect(screen.getByText(msgTextGlobal)).toBeInTheDocument();
    });
    expect(screen.queryByText(msgNameGlobal)).not.toBeInTheDocument();
  });
});
