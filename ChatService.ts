import { BASE_URL } from './config/config';
import { ChatMessage, ChatRoom, ChatUser } from './WebSocketService';

class ChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}, token?: string) {
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private getAuthToken(): string | null {
    // This should get the token from your auth context or storage
    // For now, we'll return null and let the component handle auth
    // TODO: Implement proper token retrieval from auth context
    return null;
  }

  // Get all available chat rooms
  async getRooms(token: string): Promise<ChatRoom[]> {
    const response = await this.request('/api/chat/rooms', {}, token);
    return response.rooms || [];
  }

  // Create a new chat room
  async createRoom(token: string, name: string, description?: string, isPrivate: boolean = false): Promise<ChatRoom> {
    const response = await this.request('/api/chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, description, isPrivate }),
    }, token);
    return response.room;
  }

  // Get messages from a chat room
  async getMessages(token: string, roomId: string, page: number = 1, limit: number = 50): Promise<{
    messages: ChatMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await this.request(`/api/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`, {}, token);
    return response;
  }

  // Send a message to a chat room
  async sendMessage(token: string, roomId: string, text: string): Promise<ChatMessage> {
    const response = await this.request('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId, text }),
    }, token);
    return response.message;
  }

  // Get active users in a chat room
  async getRoomUsers(token: string, roomId: string): Promise<ChatUser[]> {
    const response = await this.request(`/api/chat/rooms/${roomId}/users`, {}, token);
    return response.users || [];
  }

  // Get user's chat rooms
  async getUserRooms(token: string): Promise<ChatRoom[]> {
    const response = await this.request('/api/chat/user/rooms', {}, token);
    return response.rooms || [];
  }

  // Join a chat room
  async joinRoom(token: string, roomId: string): Promise<void> {
    await this.request(`/api/chat/rooms/${roomId}/join`, {
      method: 'POST',
    }, token);
  }

  // Leave a chat room
  async leaveRoom(token: string, roomId: string): Promise<void> {
    await this.request(`/api/chat/rooms/${roomId}/leave`, {
      method: 'POST',
    }, token);
  }
}

export const chatService = new ChatService(); 