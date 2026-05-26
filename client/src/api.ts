import type { ChatPreview, Message, User } from './types';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('lt:token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register(username: string, password: string, displayName: string) {
    return request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
  },
  login(username: string, password: string) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    return request<{ user: User }>('/auth/me');
  },
  updateMe(data: { displayName?: string; bio?: string }) {
    return request<{ ok: true }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  searchUsers(q: string) {
    return request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`);
  },
  listChats() {
    return request<{ chats: ChatPreview[] }>('/chats');
  },
  createDirect(userId: string) {
    return request<{ chat: ChatPreview }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ type: 'direct', userId }),
    });
  },
  createGroup(title: string, userIds: string[]) {
    return request<{ chat: ChatPreview }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ type: 'group', title, userIds }),
    });
  },
  createChannel(title: string, userIds: string[] = []) {
    return request<{ chat: ChatPreview }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ type: 'channel', title, userIds }),
    });
  },
  loadMessages(chatId: string, before?: number) {
    const qs = before ? `?before=${before}` : '';
    return request<{ messages: Message[] }>(`/chats/${chatId}/messages${qs}`);
  },
  markRead(chatId: string) {
    return request<{ ok: true }>(`/chats/${chatId}/read`, { method: 'POST' });
  },
};
