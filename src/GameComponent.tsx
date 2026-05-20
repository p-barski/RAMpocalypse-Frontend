import { useEffect, type RefObject } from 'react';
import { createGame } from './createGame';
import type { Game } from './game';
import type { GameSettings } from './gameSettings';
import type { ChatMessageServer } from './interfaces/messageInterfaces';

export interface GameComponentProps {
  serverUrl: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  settings: GameSettings;
  gameRef: RefObject<Game | null>;
  onMessageReceivedRef: RefObject<(message: ChatMessageServer) => void>;
}

function GameComponent({ serverUrl, canvasRef, settings, gameRef, onMessageReceivedRef }: GameComponentProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dismountMessage = 'Component dismounted.';
    let isMounted = true;
    let game: Game | null = null;

    (async () => {
      try {
        game = await createGame(serverUrl, canvas, settings);
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
  }, [serverUrl, settings, canvasRef, gameRef, onMessageReceivedRef]);

  return <canvas ref={canvasRef} tabIndex={0}></canvas>;
}

export default GameComponent;
