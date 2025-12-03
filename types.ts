export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'busy';
  isBot?: boolean;
  customBotName?: string; // User's custom name for the AI
  theme?: string; // 'midnight' | 'giggle' | 'ocean' | 'forest'
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'denied';
  timestamp: number;
}

export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  timestamp: number;
}

export interface ToxicityResult {
  score: number;
  category: string;
  flagged: boolean;
  reason?: string;
}

export interface Message {
  id: string;
  conversationId: string; // usually combination of userId_userId
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'quarantined' | 'pending';
  toxicity?: ToxicityResult;
  type?: 'text' | 'call_link';
}

export interface ChatSession {
  participantId: string;
  lastMessage?: Message;
  unreadCount: number;
}

export enum AppView {
  LOGIN,
  CHAT,
  SETTINGS
}