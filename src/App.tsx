import { useRef, useCallback, useState } from 'react';
import { loadSettings } from './gameSettings';
import type { Game } from './game';
import type { ChatMessageServer, ChatMessageType } from './interfaces/messageInterfaces';
import Chat from './Chat';
import GameComponent from './GameComponent';
import Settings from './Settings';
import './App.css';

declare global {
  interface Window {
    game?: Game | null;
  }
}

export {};
function App() {
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings] = useState(loadSettings);
  const gameRef = useRef<Game>(null);
  const openSettingsRef = useRef<() => void>(() => {});
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

  const handleOpenSettings = useCallback(() => {
    openSettingsRef.current?.();
  }, []);

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
          <button className="game-button" onClick={handleOpenSettings}>
            Settings
          </button>
        </div>
      </header>
      <GameComponent
        serverUrl={serverUrl}
        canvasRef={canvasRef}
        settings={settings}
        gameRef={gameRef}
        onMessageReceivedRef={onMessageReceivedRef}
      />
      <Settings settings={settings} canvasRef={canvasRef} openSettingsRef={openSettingsRef} />
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
