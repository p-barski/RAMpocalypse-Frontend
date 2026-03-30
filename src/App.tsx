import { useRef, useEffect, useCallback } from 'react';
import { createGame } from './createGame';
import type { Game } from './game';
import type { ChatMessageServer, ChatMessageType } from './interfaces/messageInterfaces';
import Chat from './Chat';
import './App.css';

declare global {
  interface Window {
    game?: Game | null;
  }
}

export {};
function App() {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5027';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(null);
  const onMessageReceivedRef = useRef<(message: ChatMessageServer) => void>(() => {});

  const registerOnMessageReceived = useCallback((handler: (message: ChatMessageServer) => void) => {
    onMessageReceivedRef.current = handler;
  }, []);

  const sendMessage = useCallback(async (message: string, type: ChatMessageType) => {
    await gameRef.current?.sendMessage(message, type);
  }, []);

  const handleRequestMatchmaking = useCallback(async () => {
    await gameRef.current?.requestMatchmaking();
  }, []);

  const handleLeaveGame = useCallback(async () => {
    await gameRef.current?.leaveGame();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const abortController = new AbortController();
    let game: Game | null = null;

    (async () => {
      try {
        game = await createGame(serverUrl, abortController, canvas);
        if (abortController.signal.aborted) return;
        gameRef.current = game;
        window.game = game;
        if (abortController.signal.aborted) return;
        await game.connect().catch((error) => {
          if (!abortController.signal.aborted) game?.onClose(error);
        });
        if (abortController.signal.aborted) return;
        game.onMessageReceived = onMessageReceivedRef.current;
        game.start();
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error(err);
        }
        game?.stop();
      }
    })();

    return () => {
      abortController.abort();
      game?.stop();
      gameRef.current = null;
    };
  });

  return (
    <div className="App">
      <header className="App-header">
        <div className="button-container">
          <button className="game-button" onClick={handleRequestMatchmaking}>
            Request matchmaking
          </button>
          <button className="game-button" onClick={handleLeaveGame}>
            Leave game
          </button>
        </div>
      </header>
      <canvas ref={canvasRef} tabIndex={0}></canvas>
      <Chat
        canvasRef={canvasRef}
        serverUrl={serverUrl}
        sendMessage={sendMessage}
        registerOnMessageReceived={registerOnMessageReceived}
      />
    </div>
  );
}

export default App;
