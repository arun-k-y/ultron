import { WS } from './config/config';

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  timestamp: Date;
  type: 'message' | 'system';
}

export interface ChatUser {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: Date;
  lastActivity: Date;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Function[]> = new Map();
  private isConnecting = false;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        // Use the same IP address as the backend server, but with ws:// protocol
        const wsUrl = `${WS}?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = this.handleMessage;
        this.ws.onerror = this.handleError;
        this.ws.onclose = this.handleClose;

        // Set a timeout for connection
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      // Call registered handlers for this message type
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => handler(data.data));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;

    // Attempt to reconnect if not manually closed
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        // Note: Reconnection would need to be handled by the component
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Send a message to the server
  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      console.log('Sending WebSocket message:', { type, payload });
      this.ws.send(message);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Join a chat room
  joinRoom(roomId: string) {
    this.send('join_room', { roomId });
  }

  // Leave a chat room
  leaveRoom(roomId: string) {
    this.send('leave_room', { roomId });
  }

  // Send a message to a room
  sendMessage(roomId: string, text: string) {
    this.send('send_message', { roomId, message: text });
  }

  // Start typing indicator
  startTyping(roomId: string) {
    this.send('typing_start', { roomId });
  }

  // Stop typing indicator
  stopTyping(roomId: string) {
    this.send('typing_stop', { roomId });
  }

  // Ping to keep connection alive
  ping() {
    this.send('ping', {});
  }

  // Register a message handler
  on(type: string, handler: Function) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // Remove a message handler
  off(type: string, handler: Function) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService(); 