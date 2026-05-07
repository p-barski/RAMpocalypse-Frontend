import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessageTypeValue, type ChatMessageServer, type ChatMessageType } from './interfaces/messageInterfaces';
import { convertChatMessageFromServer, dateToChatTimestamp, profanityFilter, type ChatMessage } from './utils';
import './Chat.css';

class ChatCooldown {
  private readonly MSG_COOLDOWN_MS = 1000;
  private readonly ONE_MINUTE_MS = 60000;
  private readonly MAX_MSGS_PER_MINUTE = 30;
  private readonly previousTimestamps = new Float64Array(this.MAX_MSGS_PER_MINUTE);
  private currentTimestampIndex = 0;
  private lastMsgSentTimestamp = 0;

  getRemainingCooldown(): number {
    const now = Date.now();
    const secondCooldownRemaining = this.MSG_COOLDOWN_MS - (now - this.lastMsgSentTimestamp);
    const minuteCooldownRemaining = this.ONE_MINUTE_MS - (now - this.previousTimestamps[this.currentTimestampIndex]);
    return Math.max(0, secondCooldownRemaining, minuteCooldownRemaining);
  }

  updateCooldowns(): void {
    const now = Date.now();
    this.previousTimestamps[this.currentTimestampIndex] = now;
    this.currentTimestampIndex = (this.currentTimestampIndex + 1) % this.MAX_MSGS_PER_MINUTE;
    this.lastMsgSentTimestamp = now;
  }
}

interface ChatProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  serverUrl: string;
  sendMessage: (message: string, type: ChatMessageType) => Promise<void>;
  registerOnMessageReceived: (callback: (msg: ChatMessageServer) => void) => void;
}

function Chat({ canvasRef, serverUrl, sendMessage, registerOnMessageReceived }: ChatProps) {
  const isChatActiveRef = useRef(false);
  const chatCooldownRef = useRef<ChatCooldown | null>(null);
  const [onCooldown, setOnCooldown] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatMessageType>(ChatMessageTypeValue.Global);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [lobbyMessages, setLobbyMessages] = useState<ChatMessage[]>([]);
  const activeMessages = activeTab === ChatMessageTypeValue.Global ? globalMessages : lobbyMessages;
  const messageInputRef = useRef<HTMLInputElement>(null);
  const bottomOfMessagesDivRef = useRef<HTMLDivElement>(null);

  const setIsChatActiveState = useCallback((value: boolean) => {
    isChatActiveRef.current = value;
    setIsChatActive(value);
  }, []);

  const handleSendMessage = useCallback(() => {
    const message = messageInputRef.current?.value;
    if (message === undefined || !message.trim()) return;
    const cooldown = chatCooldownRef.current?.getRemainingCooldown();
    if (cooldown !== undefined && cooldown > 0) {
      setOnCooldown(true);
      setTimeout(() => setOnCooldown(false), cooldown);
      return;
    }
    chatCooldownRef.current?.updateCooldowns();
    sendMessage(profanityFilter.clean(message), activeTab);
    messageInputRef.current!.value = '';
  }, [sendMessage, activeTab]);

  useEffect(() => {
    chatCooldownRef.current = new ChatCooldown();
    const onMessageReceived = (msg: ChatMessageServer) => {
      const msgUI = convertChatMessageFromServer(msg);
      switch (msg.type) {
        case ChatMessageTypeValue.Global:
          setGlobalMessages((prev) => [...prev, msgUI]);
          break;
        default:
          setLobbyMessages((prev) => [...prev, msgUI]);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isActive = isChatActiveRef.current;
      if (e.key === 'Enter') {
        if (isActive) canvasRef.current?.focus();
        else messageInputRef.current?.focus();
        setIsChatActiveState(!isActive);
      }
      if (e.key === 'Escape') {
        setIsChatActiveState(false);
        canvasRef.current?.focus();
      }
    };

    registerOnMessageReceived(onMessageReceived);
    window.addEventListener('keydown', handleKeyDown);

    (async () => {
      try {
        const response = await fetch(`${serverUrl}/api/globalChatHistory`);
        const messagesFromServer: ChatMessageServer[] = await response.json();
        const messages = messagesFromServer.map(convertChatMessageFromServer);
        setGlobalMessages(messages);
      } catch (error) {
        console.warn('Error occurred when requesting global chat history from the server', error);
        const timestamp = dateToChatTimestamp(new Date());
        const message: ChatMessage = { text: 'Could not load chat history.', ownerName: '', timestamp };
        setGlobalMessages([message]);
      }
    })();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [registerOnMessageReceived, canvasRef, serverUrl, setIsChatActiveState]);

  useEffect(() => {
    bottomOfMessagesDivRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [activeMessages]);

  return (
    <div className={`chat-container ${isChatActive ? 'active' : ''}`}>
      <div className="chat-types-container">
        <button
          onClick={() => setActiveTab(ChatMessageTypeValue.Global)}
          className={activeTab === ChatMessageTypeValue.Global ? 'button-active' : ''}
        >
          Global chat
        </button>
        <button
          onClick={() => setActiveTab(ChatMessageTypeValue.Lobby)}
          className={activeTab === ChatMessageTypeValue.Lobby ? 'button-active' : ''}
        >
          Lobby chat
        </button>
      </div>
      <div className="messages-container">
        <div className="message">
          {activeMessages.map((msg, i) => (
            <div key={i}>
              <span>{msg.timestamp}|</span>
              <span>{msg.ownerName}: </span>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div ref={bottomOfMessagesDivRef} />
      </div>
      <div className="chat-input-container">
        <input
          className={`${onCooldown ? 'on-cooldown' : ''}`}
          ref={messageInputRef}
          type="text"
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>{onCooldown ? '❌' : '⬅️'}</button>
      </div>
    </div>
  );
}

export default Chat;
