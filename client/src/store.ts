import { create } from 'zustand';
import type { AppNotification, ChatPreview, Message, Post, StoryGroup, User } from './types';

interface TypingEntry {
  userId: string;
  displayName: string;
  expiresAt: number;
}

interface State {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;

  // Chats
  chats: ChatPreview[];
  setChats: (chats: ChatPreview[]) => void;
  upsertChat: (chat: ChatPreview) => void;

  activeChatId: string | null;
  setActiveChat: (id: string | null) => void;

  // Messages
  messagesByChat: Record<string, Message[]>;
  setMessages: (chatId: string, messages: Message[]) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  appendMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, id: string, patch: Partial<Message>) => void;
  removeMessage: (chatId: string, id: string) => void;
  replaceMessage: (chatId: string, tempId: string, message: Message) => void;

  // Presence
  onlineUsers: Record<string, boolean>;
  setOnline: (userId: string, online: boolean) => void;

  // Typing
  typingByChat: Record<string, TypingEntry[]>;
  setTyping: (chatId: string, userId: string, displayName: string, typing: boolean) => void;
  pruneTyping: () => void;

  // Posts
  feedPosts: Post[];
  setFeedPosts: (posts: Post[]) => void;
  upsertPost: (post: Post) => void;
  removePost: (id: string) => void;

  // Stories
  storyGroups: StoryGroup[];
  setStoryGroups: (groups: StoryGroup[]) => void;

  // Notifications
  notifications: AppNotification[];
  unreadNotifications: number;
  setNotifications: (n: AppNotification[], unread: number) => void;
  pushNotification: (n: AppNotification) => void;
  clearUnreadNotifications: () => void;

  // UI panels
  profileViewUserId: string | null;
  showProfileView: (id: string | null) => void;

  view: 'chats' | 'feed' | 'notifications';
  setView: (v: 'chats' | 'feed' | 'notifications') => void;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const savedToken = localStorage.getItem('lt:token');
const savedUserRaw = localStorage.getItem('lt:user');
const savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as User) : null;
const savedTheme = (localStorage.getItem('lt:theme') as 'dark' | 'light' | null) ?? 'dark';

export const useStore = create<State>((set, get) => ({
  token: savedToken,
  user: savedUser,
  setAuth: (token, user) => {
    localStorage.setItem('lt:token', token);
    localStorage.setItem('lt:user', JSON.stringify(user));
    set({ token, user });
  },
  updateUser: (patch) => {
    const cur = get().user;
    if (!cur) return;
    const next = { ...cur, ...patch };
    localStorage.setItem('lt:user', JSON.stringify(next));
    set({ user: next });
  },
  logout: () => {
    localStorage.removeItem('lt:token');
    localStorage.removeItem('lt:user');
    set({
      token: null,
      user: null,
      chats: [],
      messagesByChat: {},
      activeChatId: null,
      onlineUsers: {},
      typingByChat: {},
    });
  },

  chats: [],
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((state) => {
      const idx = state.chats.findIndex((c) => c.id === chat.id);
      const list = [...state.chats];
      if (idx >= 0) list[idx] = chat;
      else list.unshift(chat);
      list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      return { chats: list };
    }),

  activeChatId: null,
  setActiveChat: (id) => set({ activeChatId: id }),

  messagesByChat: {},
  setMessages: (chatId, messages) =>
    set((state) => ({ messagesByChat: { ...state.messagesByChat, [chatId]: messages } })),
  prependMessages: (chatId, messages) =>
    set((state) => {
      const existing = state.messagesByChat[chatId] ?? [];
      const ids = new Set(existing.map((m) => m.id));
      const merged = [...messages.filter((m) => !ids.has(m.id)), ...existing];
      return { messagesByChat: { ...state.messagesByChat, [chatId]: merged } };
    }),
  appendMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messagesByChat[chatId] ?? [];
      if (existing.some((m) => m.id === message.id)) return {};
      // If a pending temp message matches (same author, same body, within 60s), replace it
      const tempIdx = existing.findIndex(
        (m) =>
          m.pending &&
          m.authorId === message.authorId &&
          m.body === message.body &&
          Math.abs(m.createdAt - message.createdAt) < 60_000,
      );
      if (tempIdx >= 0) {
        const copy = [...existing];
        copy[tempIdx] = { ...message, pending: false };
        return { messagesByChat: { ...state.messagesByChat, [chatId]: copy } };
      }
      return {
        messagesByChat: { ...state.messagesByChat, [chatId]: [...existing, message] },
      };
    }),
  updateMessage: (chatId, id, patch) =>
    set((state) => {
      const existing = state.messagesByChat[chatId];
      if (!existing) return {};
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: existing.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        },
      };
    }),
  removeMessage: (chatId, id) =>
    set((state) => {
      const existing = state.messagesByChat[chatId];
      if (!existing) return {};
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: existing.filter((m) => m.id !== id),
        },
      };
    }),
  replaceMessage: (chatId, tempId, message) =>
    set((state) => {
      const existing = state.messagesByChat[chatId];
      if (!existing) return {};
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: existing.map((m) => (m.id === tempId ? message : m)),
        },
      };
    }),

  onlineUsers: {},
  setOnline: (userId, online) =>
    set((state) => ({ onlineUsers: { ...state.onlineUsers, [userId]: online } })),

  typingByChat: {},
  setTyping: (chatId, userId, displayName, typing) =>
    set((state) => {
      const current = state.typingByChat[chatId] ?? [];
      const filtered = current.filter((t) => t.userId !== userId);
      if (typing) filtered.push({ userId, displayName, expiresAt: Date.now() + 4500 });
      return { typingByChat: { ...state.typingByChat, [chatId]: filtered } };
    }),
  pruneTyping: () =>
    set((state) => {
      const now = Date.now();
      const next: Record<string, TypingEntry[]> = {};
      for (const [cid, list] of Object.entries(state.typingByChat)) {
        next[cid] = list.filter((t) => t.expiresAt > now);
      }
      return { typingByChat: next };
    }),

  feedPosts: [],
  setFeedPosts: (posts) => set({ feedPosts: posts }),
  upsertPost: (post) =>
    set((state) => {
      const idx = state.feedPosts.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        const copy = [...state.feedPosts];
        copy[idx] = post;
        return { feedPosts: copy };
      }
      return { feedPosts: [post, ...state.feedPosts] };
    }),
  removePost: (id) =>
    set((state) => ({ feedPosts: state.feedPosts.filter((p) => p.id !== id) })),

  storyGroups: [],
  setStoryGroups: (groups) => set({ storyGroups: groups }),

  notifications: [],
  unreadNotifications: 0,
  setNotifications: (n, unread) => set({ notifications: n, unreadNotifications: unread }),
  pushNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 100),
      unreadNotifications: state.unreadNotifications + (n.read ? 0 : 1),
    })),
  clearUnreadNotifications: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadNotifications: 0,
    })),

  profileViewUserId: null,
  showProfileView: (id) => set({ profileViewUserId: id }),

  view: 'chats',
  setView: (view) => set({ view }),

  theme: savedTheme,
  setTheme: (theme) => {
    localStorage.setItem('lt:theme', theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
}));

// Apply initial theme on load
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = savedTheme;
}
