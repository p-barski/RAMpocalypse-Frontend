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

    const dismountMessage = 'Component dismounted.';
    let isMounted = true;
    let game: Game | null = null;

    (async () => {
      try {
        game = await createGame(serverUrl, canvas);
        if (!isMounted) throw new Error(dismountMessage);
        gameRef.current = game;
        window.game = game;
        game.onMessageReceived = onMessageReceivedRef.current;
        game.enterLocalSandbox();
        game.start();
        await game.connect().catch((error) => {
          if (isMounted) game?.onClose(error);
        });
        if (!isMounted) throw new Error(dismountMessage);
      } catch (err) {
        if ((err as Error)?.message !== dismountMessage) console.warn(err);
        game?.stop();
      }
    })();

    return () => {
      isMounted = false;
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
