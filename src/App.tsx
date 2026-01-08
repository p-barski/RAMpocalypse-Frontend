import React, { useRef, useEffect } from 'react';
import './App.css';
import { Game } from './game';

import { createGame } from './createGame';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5027';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const abortController = new AbortController();

    (async () => {
      try {
        // Load fallback image first (needed for SpriteManager)
        const game = await createGame(serverUrl, abortController, canvas);
        gameRef.current = game;

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
      // Use the ref to ensure we're stopping the current game instance
      // This prevents stopping a game that hasn't started yet
      abortController.abort();
      if (gameRef.current) {
        gameRef.current.stop();
        gameRef.current = null;
      }
    };
  }, []);

  const handleRequestMatchmaking = async () => {
    if (gameRef.current) {
      try {
        await gameRef.current.requestMatchmaking();
      } catch (error) {
        console.error('Error requesting matchmaking:', error);
      }
    }
  };

  const handleLeaveGame = async () => {
    if (gameRef.current) {
      try {
        await gameRef.current.leaveGame();
      } catch (error) {
        console.error('Error leaving game:', error);
      }
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
