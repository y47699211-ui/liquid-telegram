export interface ProfileLink {
  label: string;
  url: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  bio: string;
  statusEmoji: string;
  statusText: string;
  accentColor: string;
  links: ProfileLink[];
  onboarded: boolean;
  createdAt?: number;
  lastSeen?: number;
}

export type ChatType = 'direct' | 'group' | 'channel';

export type ChatMember = User;

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
  pinnedMessage: { id: string; body: string; authorName: string } | null;
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
  imageUrl: string | null;
  replyTo: string | null;
  pinned: boolean;
  editedAt: number | null;
  deletedAt: number | null;
  createdAt: number;
  reactions: Reaction[];
  pending?: boolean;
}

export interface Post {
  id: string;
  body: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: number;
  liked: boolean;
  author: User;
}

export interface PostComment {
  id: string;
  postId: string;
  body: string;
  createdAt: number;
  author: User;
}

export interface Story {
  id: string;
  body: string;
  imageUrl: string | null;
  background: string;
  createdAt: number;
  expiresAt: number;
  author: User;
  views: number;
  viewed: boolean;
}

export interface StoryGroup {
  authorId: string;
  author: User;
  stories: Story[];
  allViewed: boolean;
  latestAt: number;
}

export type NotificationKind = 'like' | 'comment' | 'follow' | 'mention';

export interface AppNotification {
  id: string;
  type: NotificationKind | string;
  body: string;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: number;
  actor: User | null;
}
