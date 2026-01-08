import * as signalR from '@microsoft/signalr';
import { CallbacksHandler } from './callbacksHandler';
import { CommunicationService } from './communicatonService';
import { Position } from './messageInterfaces';

export class SignalRService implements CommunicationService {
  private readonly connection: signalR.HubConnection;
  private readonly serverUrl: string;
  private readonly abortSignal: AbortSignal;

  constructor(serverUrl: string, abortSignal: AbortSignal) {
    this.serverUrl = serverUrl;
    this.abortSignal = abortSignal;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.serverUrl}/gamehub`)
      .withAutomaticReconnect()
      .build();
  }

  async connect(callbacksHandler: CallbacksHandler): Promise<string> {
    this.connection.onreconnecting(() => {
      console.warn('SignalR: Reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.warn('SignalR: Reconnected');
    });

    this.connection.onclose((error) => {
      // TODO GAME SHOULD HANDLE THIS
      console.warn('SignalR: Connection closed', error);
    });

    this.connection.on('LobbyStarted', callbacksHandler.onLobbyStart);
    this.connection.on('PlayerLeftLobby', callbacksHandler.onPlayerLeftLobby);
    this.connection.on('PlayerPositionUpdated', callbacksHandler.onOtherPlayerPositionUpdated);
    this.connection.on('PositionCorrected', callbacksHandler.onPositionCorrected);
    this.connection.on('AttackPerformed', callbacksHandler.onAttackPerformed);
    this.connection.on('PlayerDamaged', callbacksHandler.onPlayerDamaged);
    this.connection.on('PlayerDied', callbacksHandler.onPlayerDied);
    this.connection.on('PlayerRespawned', callbacksHandler.onPlayerRespawned);
    this.connection.on('GameEnded', callbacksHandler.onGameEnded);

    this.abortSignal.addEventListener(
      'abort',
      () => {
        console.log('SignalR: Abort signal received, stopping connection');
        this.connection.stop();
      },
      { once: true },
    );

    try {
      if (this.abortSignal.aborted) throw new Error('Abort signal received');
      await this.connection.start();
      console.log('SignalR: Connected');
      const playerId = await this.connection.invoke<string>('Connect');
      console.log('SignalR: Connected to game');
      return playerId;
    } catch (error) {
      if (this.abortSignal.aborted) throw new Error('Abort signal received when connecting to server');
      console.warn('SignalR: Connection failed', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.connection.stop();
    console.log('SignalR: Disconnected');
  }

  async requestMatchmaking(): Promise<boolean> {
    try {
      const result = await this.connection.invoke<boolean>('RequestMatchmaking');
      console.log('SignalR: Matchmaking requested', result);
      return result;
    } catch (error) {
      if (this.abortSignal.aborted) return false;
      console.error('SignalR: Failed to request matchmaking', error);
      throw error;
    }
  }

  async updatePlayerPosition(position: Position): Promise<void> {
    try {
      await this.connection.invoke('UpdatePlayerPosition', position);
    } catch (error) {
      console.error('SignalR: Failed to update player position', error);
    }
  }

  async performMeleeAttack(attackDirection: Position): Promise<void> {
    try {
      await this.connection.invoke('PerformMeleeAttack', attackDirection);
    } catch (error) {
      console.error('SignalR: Failed to perform melee attack', error);
    }
  }

  async performProjectileAttack(direction: Position): Promise<void> {
    try {
      await this.connection.invoke('PerformProjectileAttack', direction);
    } catch (error) {
      console.error('SignalR: Failed to perform projectile attack', error);
    }
  }

  async performSpecialAttack(position: Position): Promise<void> {
    try {
      await this.connection.invoke('PerformSpecialAttack', position);
    } catch (error) {
      console.error('SignalR: Failed to perform special attack', error);
    }
  }

  async reportProjectileHit(projectileOwnerId: string, hitPlayerId: string, x: number, y: number): Promise<void> {
    try {
      await this.connection.invoke('ProjectileHitPlayer', projectileOwnerId, hitPlayerId, x, y);
    } catch (error) {
      console.error('SignalR: Failed to report projectile hit', error);
    }
  }

  async leaveGame(): Promise<void> {
    try {
      await this.connection.invoke('LeaveGame');
      console.log('SignalR: Left game');
    } catch (error) {
      console.error('SignalR: Failed to leave game', error);
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}
