export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  lastSeen?: number;
}

export type ChatType = 'direct' | 'group' | 'channel';

export interface ChatMember {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  lastSeen: number;
}

export interface ChatPreview {
  id: string;
  type: ChatType;
  title: string;
  avatarColor: string;
  lastMessage: {
    id: string;
    body: string;
    authorId: string;
    authorName: string;
    createdAt: number;
  } | null;
  lastMessageAt: number;
  unread: number;
  members: ChatMember[];
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  body: string;
  replyTo: string | null;
  editedAt: number | null;
  deletedAt: number | null;
  createdAt: number;
  reactions: Reaction[];
  pending?: boolean;
}
