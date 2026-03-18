import { useRef, useEffect } from 'react';
import { createGame } from './createGame';
import type { Game } from './game';
import './App.css';

declare global {
  interface Window {
    game?: Game | null;
  }
}

export {};
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5027';

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
        await game.connect();
        if (abortController.signal.aborted) return;
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
  }, [serverUrl]);

  const handleRequestMatchmaking = async () => {
    if (gameRef.current) {
      await gameRef.current.requestMatchmaking();
    }
  };

  const handleLeaveGame = async () => {
    if (gameRef.current) {
      await gameRef.current.leaveGame();
    }
  };

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
        <canvas ref={canvasRef}></canvas>
      </header>
    </div>
  );
}

export default App;
