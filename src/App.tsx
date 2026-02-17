import React, { useRef, useEffect } from 'react';
import './App.css';
import { Game } from './game';

import { createGame } from './createGame';
declare global {
  interface Window {
    game?: Game | null;
  }
}

export {};
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5027';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    (async () => {
      try {
        const game = await createGame(serverUrl, abortController, canvas);
        gameRef.current = game;
        window.game = game;

        await game.connect();
        if (abortController.signal.aborted) return;
        game.start();
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error(err);
        } else {
          console.log(`AbortError: ${err}`);
        }
      }
    })();

    return () => {
      if (gameRef.current) {
        gameRef.current.stop();
        abortControllerRef.current?.abort();
        gameRef.current = null;
        abortControllerRef.current = null;
      }
    };
  }, []);

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
