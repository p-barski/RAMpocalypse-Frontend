import type { ChatMessageServer } from './interfaces/messageInterfaces';
import { Filter } from 'bad-words';

export const profanityFilter = new Filter();

export function sleep(ms: number) {
  const start = Date.now();
  let now = start;
  while (now - start < ms) {
    now = Date.now();
  }
}

export async function sleepAsync(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ChatMessage {
  text: string;
  ownerName: string;
  timestamp: string;
}

export function dateToChatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function convertChatMessageFromServer(message: ChatMessageServer): ChatMessage {
  return {
    text: profanityFilter.clean(message.text),
    ownerName: message.ownerName,
    timestamp: dateToChatTimestamp(new Date(message.timestamp)),
  };
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
