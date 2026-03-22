import * as signalR from '@microsoft/signalr';
import type { CallbacksHandler } from './interfaces/callbacksHandler';
import type { CommunicationService } from './interfaces/communicatonService';
import type { Position } from './interfaces/messageInterfaces';

export class SignalRService implements CommunicationService {
  private readonly connection: signalR.HubConnection;
  private readonly serverUrl: string;
  private readonly abortSignal: AbortSignal;
  private readonly callbacksHandler: CallbacksHandler;
  private isExplicitlyDisconnected = false;

  constructor(serverUrl: string, abortSignal: AbortSignal, callbacksHandler: CallbacksHandler) {
    this.serverUrl = serverUrl;
    this.abortSignal = abortSignal;
    this.callbacksHandler = callbacksHandler;
    this.connection = new signalR.HubConnectionBuilder().withUrl(`${this.serverUrl}/gamehub`).build();

    this.connection.onclose((error) => {
      if (!this.isExplicitlyDisconnected) this.callbacksHandler.onClose(error);
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
        this.disconnect();
      },
      { once: true },
    );
  }

  async connect(): Promise<string> {
    this.isExplicitlyDisconnected = false;
    try {
      if (this.abortSignal.aborted) throw new Error('Abort signal received');
      await this.connection.start();
      console.log('SignalR: Connected');
      const playerId = await this.connection.invoke<string>('GetPlayerId');
      console.log('SignalR: Connected to game');
      return playerId;
    } catch (error) {
      if (this.abortSignal.aborted) throw new Error('Abort signal received when connecting to server');
      console.warn('SignalR: Connection failed', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isExplicitlyDisconnected = true;
    if (this.isConnected()) await this.connection.stop();
    console.log('SignalR: Disconnected');
  }

  async requestMatchmaking(): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('RequestMatchmaking');
    } catch (error) {
      if (this.abortSignal.aborted) return;
      console.error('SignalR: Failed to request matchmaking', error);
    }
  }

  async updatePlayerPosition(position: Position): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('UpdatePlayerPosition', position);
    } catch (error) {
      console.error('SignalR: Failed to update player position', error);
    }
  }

  async performMeleeAttack(): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('PerformMeleeAttack');
    } catch (error) {
      console.error('SignalR: Failed to perform melee attack', error);
    }
  }

  async performProjectileAttack(): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('PerformProjectileAttack');
    } catch (error) {
      console.error('SignalR: Failed to perform projectile attack', error);
    }
  }

  async performSpecialAttack(): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('PerformSpecialAttack');
    } catch (error) {
      console.error('SignalR: Failed to perform special attack', error);
    }
  }

  async projectileHitPlayer(projectileId: string, hitPlayerId: string): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('ProjectileHitPlayer', projectileId, hitPlayerId);
    } catch (error) {
      console.error('SignalR: Failed to report projectile hit', error);
    }
  }

  async leaveGame(): Promise<void> {
    try {
      if (this.isConnected()) await this.connection.invoke('LeaveGame');
    } catch (error) {
      console.error('SignalR: Failed to leave game', error);
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}
