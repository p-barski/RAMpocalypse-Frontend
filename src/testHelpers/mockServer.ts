import { vi, type Mock } from 'vitest';
import gameConfig from '../../public/gameconfig.json';
import type { ChatMessageServer } from '../interfaces/messageInterfaces';

const GAMECONFIG_BODY = JSON.stringify(gameConfig);

type InvokeHandler = (method: string, ...args: unknown[]) => unknown | Promise<unknown>;

const defaultInvokeHandler: InvokeHandler = () => {};

export interface MockHub {
  invokeSpy: Mock<(method: string, ...args: unknown[]) => Promise<unknown>>;
  invokeHandler: InvokeHandler;
  startSpy: Mock<() => Promise<void>>;
  stopSpy: Mock<() => Promise<void>>;
  onHandlers: Map<string, Array<(...args: unknown[]) => void>>;
  onCloseHandlers: Array<(error: Error | undefined) => void>;
  connected: boolean;
  emit: (event: string, ...args: unknown[]) => void;
}

export interface MockServer {
  serverUrl: string;
  chatHistory: ChatMessageServer[];
  chatHistoryStatus: number;
  hub: MockHub;
  uninstall: () => void;
}

let mockedServer: MockServer | null = null;

function createHub(playerId: string): MockHub {
  const onHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
  const onCloseHandlers: Array<(error: Error | undefined) => void> = [];
  let connected = false;

  const startSpy = vi.fn(async () => {
    connected = true;
  });

  const stopSpy = vi.fn(async () => {
    connected = false;
    onCloseHandlers.forEach((handler) => handler(undefined));
  });

  const hub: MockHub = {
    invokeSpy: vi.fn(),
    invokeHandler: defaultInvokeHandler,
    startSpy,
    stopSpy,
    onHandlers,
    onCloseHandlers,
    get connected() {
      return connected;
    },
    set connected(value: boolean) {
      connected = value;
    },
    emit(event: string, ...args: unknown[]) {
      const handlers = onHandlers.get(event) ?? [];
      handlers.forEach((handler) => handler(...args));
    },
  };

  hub.invokeSpy = vi.fn(async (method: string, ...args: unknown[]) => {
    const result = hub.invokeHandler(method, ...args);
    if (result !== undefined) {
      return result;
    }
    switch (method) {
      case 'GetPlayerId':
        return playerId;
      default:
        return undefined;
    }
  });

  return hub;
}

vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: {
    Connected: 'Connected',
  },
  HubConnectionBuilder: class HubConnectionBuilder {
    build() {
      const hub = mockedServer?.hub;
      if (!hub) {
        throw new Error('createMockServer() must be called before the app connects');
      }

      return {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          const handlers = hub.onHandlers.get(event) ?? [];
          handlers.push(handler);
          hub.onHandlers.set(event, handlers);
        },
        onclose: (handler: (error: Error | undefined) => void) => {
          hub.onCloseHandlers.push(handler);
        },
        start: async () => {
          await hub.startSpy();
        },
        stop: async () => {
          await hub.stopSpy();
        },
        invoke: (method: string, ...args: unknown[]) => hub.invokeSpy(method, ...args),
        get state() {
          return hub.connected ? 'Connected' : 'Disconnected';
        },
      };
    }
    withUrl() {
      return this;
    }
  },
}));

let originalFetch: typeof fetch | undefined;
let fetchInstalled = false;

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function gameConfigResponse(): Response {
  return new Response(GAMECONFIG_BODY, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function chatHistoryResponse(server: MockServer): Response {
  if (server.chatHistoryStatus !== 200) {
    return new Response('Internal Server Error', { status: server.chatHistoryStatus });
  }
  return new Response(JSON.stringify(server.chatHistory), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isApiRequest(url: string, serverUrl: string): boolean {
  try {
    const parsed = new URL(url, serverUrl);
    const base = new URL(serverUrl);
    return parsed.origin === base.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return url.startsWith(`${serverUrl}/api/`);
  }
}

function isGameConfigRequest(url: string): boolean {
  return url === '/gameconfig.json' || url.endsWith('/gameconfig.json');
}

export function createMockServer(serverUrl = 'http://localhost:5027'): MockServer {
  const hub = createHub('test-player');

  const server: MockServer = {
    serverUrl,
    chatHistory: [],
    chatHistoryStatus: 200,
    hub,
    uninstall() {
      if (mockedServer === server) {
        mockedServer = null;
      }
      if (fetchInstalled && originalFetch) {
        globalThis.fetch = originalFetch;
      }
      hub.invokeSpy.mockClear();
      hub.invokeHandler = defaultInvokeHandler;
      hub.startSpy.mockClear();
      hub.stopSpy.mockClear();
      hub.onHandlers.clear();
      hub.onCloseHandlers.length = 0;
      hub.connected = false;
    },
  };

  if (!fetchInstalled) {
    originalFetch = globalThis.fetch;
    fetchInstalled = true;
  }
  globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = resolveRequestUrl(input);
    if (isApiRequest(url, serverUrl)) {
      if (url.includes('/api/globalChatHistory')) {
        return chatHistoryResponse(server);
      }
      return new Response('Not Found', { status: 404 });
    }
    if (isGameConfigRequest(url)) {
      return gameConfigResponse();
    }
    return new Response(null, { status: 404 });
  };
  mockedServer = server;

  return server;
}
