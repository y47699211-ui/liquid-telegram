import type {
  AppNotification,
  ChatPreview,
  Message,
  Post,
  PostComment,
  ProfileLink,
  StoryGroup,
  User,
} from './types';

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

export interface ProfileUpdate {
  displayName?: string;
  bio?: string;
  statusEmoji?: string;
  statusText?: string;
  accentColor?: string;
  avatarUrl?: string | null;
  links?: ProfileLink[];
  onboarded?: boolean;
}

export interface ProfileView {
  user: User;
  followers: number;
  following: number;
  isFollowing: boolean;
  followsYou: boolean;
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
  updateMe(data: ProfileUpdate) {
    return request<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form,
    }).then(async (res) => {
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
      return (await res.json()) as { url: string };
    });
  },
  searchUsers(q: string) {
    return request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`);
  },
  getUser(id: string) {
    return request<ProfileView>(`/users/${id}`);
  },
  follow(id: string) {
    return request<{ ok: true }>(`/users/${id}/follow`, { method: 'POST' });
  },
  unfollow(id: string) {
    return request<{ ok: true }>(`/users/${id}/follow`, { method: 'DELETE' });
  },
  followers(id: string) {
    return request<{ users: User[] }>(`/users/${id}/followers`);
  },
  following(id: string) {
    return request<{ users: User[] }>(`/users/${id}/following`);
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
  feed(before?: number) {
    const qs = before ? `?before=${before}` : '';
    return request<{ posts: Post[] }>(`/posts/feed${qs}`);
  },
  discover(before?: number) {
    const qs = before ? `?before=${before}` : '';
    return request<{ posts: Post[] }>(`/posts/discover${qs}`);
  },
  userPosts(userId: string) {
    return request<{ posts: Post[] }>(`/posts/user/${userId}`);
  },
  createPost(body: string, imageUrl: string | null) {
    return request<{ post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ body, imageUrl }),
    });
  },
  togglePostLike(postId: string) {
    return request<{ post: Post }>(`/posts/${postId}/like`, { method: 'POST' });
  },
  loadComments(postId: string) {
    return request<{ comments: PostComment[] }>(`/posts/${postId}/comments`);
  },
  addComment(postId: string, body: string) {
    return request<{ comment: PostComment }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  deletePost(postId: string) {
    return request<{ ok: true }>(`/posts/${postId}`, { method: 'DELETE' });
  },
  storyFeed() {
    return request<{ groups: StoryGroup[] }>('/stories/feed');
  },
  createStory(body: string, imageUrl: string | null, background: string) {
    return request<{ story: unknown }>('/stories', {
      method: 'POST',
      body: JSON.stringify({ body, imageUrl, background }),
    });
  },
  viewStory(id: string) {
    return request<{ ok: true }>(`/stories/${id}/view`, { method: 'POST' });
  },
  deleteStory(id: string) {
    return request<{ ok: true }>(`/stories/${id}`, { method: 'DELETE' });
  },
  notifications() {
    return request<{ notifications: AppNotification[]; unread: number }>('/notifications');
  },
  markNotificationsRead() {
    return request<{ ok: true }>('/notifications/read', { method: 'POST' });
  },
};
