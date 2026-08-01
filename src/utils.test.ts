import { describe, expect, it } from 'vitest';
import { convertChatMessageFromServer, sanitizePlayerName } from './utils';
import type { ChatMessageServer } from './interfaces/messageInterfaces';
import { ChatMessageTypeValue } from './interfaces/messageInterfaces';

describe('sanitizePlayerName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizePlayerName('  Alice  ', 20)).toBe('Alice');
  });

  it('truncates names longer than the given maximum length', () => {
    expect(sanitizePlayerName('x'.repeat(30), 20)).toBe('x'.repeat(20));
  });

  it('does not truncate when no maximum length is given', () => {
    expect(sanitizePlayerName('x'.repeat(30))).toBe('x'.repeat(30));
  });

  it('censors profanity', () => {
    expect(sanitizePlayerName('fuck', 20)).not.toBe('fuck');
  });
});

describe('convertChatMessageFromServer', () => {
  function serverMessage(overrides: Partial<ChatMessageServer> = {}): ChatMessageServer {
    return {
      id: 'msg_1',
      text: 'hello',
      type: ChatMessageTypeValue.Global,
      ownerId: 'player_1',
      ownerName: 'Alice',
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  it('censors profanity in the message text', () => {
    const result = convertChatMessageFromServer(serverMessage({ text: 'fuck this' }));
    expect(result.text).not.toContain('fuck');
  });

  it('censors profanity in the owner name received from the server', () => {
    const result = convertChatMessageFromServer(serverMessage({ ownerName: 'fuck' }));
    expect(result.ownerName).not.toBe('fuck');
  });

  it('passes through a clean owner name unchanged', () => {
    const result = convertChatMessageFromServer(serverMessage({ ownerName: 'Alice' }));
    expect(result.ownerName).toBe('Alice');
  });
});
