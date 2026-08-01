import type { CommunicationService } from './interfaces/communicatonService';
import type { EntityManager } from './interfaces/entityManager';
import type { GameConfig } from './interfaces/gameConfig';
import type { Entity } from './interfaces/entity';
import type { AttackEntity, Position, ChatMessageType, Vector2D } from './interfaces/messageInterfaces';
import { createMeleeAttack, createProjectileAttack, createSpecialAttack } from './localAttackFactory';

export type GameSession = { isOnlineMatch: boolean };

export type LocalAttackBridge = {
  gameConfig: GameConfig;
  entityManager: EntityManager;
  getCreationTime: () => number;
  applyAttackEffects: (attacks: AttackEntity[]) => void;
};

export class CommunicationServiceWrapperForLocalGameplay implements CommunicationService {
  private readonly signalR: CommunicationService;
  private readonly session: GameSession;
  private localAttackBridge: LocalAttackBridge | null = null;

  constructor(signalR: CommunicationService, session: GameSession) {
    this.signalR = signalR;
    this.session = session;
  }

  attachLocalAttackBridge(bridge: LocalAttackBridge | null): void {
    this.localAttackBridge = bridge;
  }

  connect(): Promise<string> {
    return this.signalR.connect();
  }

  isConnected(): boolean {
    return this.signalR.isConnected();
  }

  disconnect(): Promise<void> {
    return this.signalR.disconnect();
  }

  sendMessage(message: string, type: ChatMessageType): Promise<void> {
    return this.signalR.sendMessage(message, type);
  }

  requestMatchmaking(): Promise<void> {
    return this.signalR.requestMatchmaking();
  }

  setPlayerName(name: string): Promise<void> {
    return this.signalR.setPlayerName(name);
  }

  async updatePlayerPosition(position: Position): Promise<void> {
    if (!this.useServerForGameplay()) return;
    await this.signalR.updatePlayerPosition(position);
  }

  async dash(velocityVector: Vector2D): Promise<boolean> {
    if (!this.useServerForGameplay()) return true;
    return this.signalR.dash(velocityVector);
  }

  async performMeleeAttack(): Promise<void> {
    if (this.useServerForGameplay()) {
      await this.signalR.performMeleeAttack();
      return;
    }
    this.spawnLocalAttacks(createMeleeAttack);
  }

  async performProjectileAttack(): Promise<void> {
    if (this.useServerForGameplay()) {
      await this.signalR.performProjectileAttack();
      return;
    }
    this.spawnLocalAttacks(createProjectileAttack);
  }

  async performSpecialAttack(): Promise<void> {
    if (this.useServerForGameplay()) {
      await this.signalR.performSpecialAttack();
      return;
    }
    this.spawnLocalAttacks(createSpecialAttack);
  }

  async projectileHitPlayer(projectileId: string, hitPlayerId: string): Promise<void> {
    if (!this.useServerForGameplay()) return;
    await this.signalR.projectileHitPlayer(projectileId, hitPlayerId);
  }

  async specialExplosion(attackId: string): Promise<void> {
    if (!this.useServerForGameplay()) return;
    await this.signalR.specialExplosion(attackId);
  }

  leaveGame(): Promise<void> {
    return this.signalR.leaveGame();
  }

  private useServerForGameplay(): boolean {
    return this.signalR.isConnected() && this.session.isOnlineMatch;
  }

  private spawnLocalAttacks(
    factory: (player: Entity, config: GameConfig, creationTime: number) => AttackEntity[],
  ): void {
    const bridge = this.localAttackBridge;
    if (!bridge) return;
    const player = bridge.entityManager.getLocalPlayerEntity();
    const attacks = factory(player, bridge.gameConfig, bridge.getCreationTime());
    bridge.applyAttackEffects(attacks);
  }
}
