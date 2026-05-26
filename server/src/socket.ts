import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import { db, type ChatRow, type MessageRow, type UserRow } from './db.js';
import { verifyToken } from './auth.js';
import { chatToListItem } from './routes/chats.js';

interface AuthedSocket extends Socket {
  data: { uid: string; username: string };
}

const onlineUsers = new Map<string, Set<string>>(); // uid -> set of socket ids

function isMember(chatId: string, userId: string): boolean {
  return !!db
    .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
    .get(chatId, userId);
}

function chatMemberIds(chatId: string): string[] {
  return db
    .prepare<[string], { user_id: string }>('SELECT user_id FROM chat_members WHERE chat_id = ?')
    .all(chatId)
    .map((r) => r.user_id);
}

export function setupSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 60_000,
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? '';
    const payload = token ? verifyToken(token) : null;
    if (!payload) return next(new Error('unauthorized'));
    socket.data.uid = payload.uid;
    socket.data.username = payload.username;
    next();
  });

  io.on('connection', (socket: AuthedSocket) => {
    const uid = socket.data.uid;
    socket.join(`user:${uid}`);

    // Mark online
    const set = onlineUsers.get(uid) ?? new Set();
    set.add(socket.id);
    onlineUsers.set(uid, set);
    db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), uid);
    broadcastPresence(uid, true);

    // Join personal rooms for all chats the user is a member of
    const chatIds = db
      .prepare<[string], { chat_id: string }>('SELECT chat_id FROM chat_members WHERE user_id = ?')
      .all(uid)
      .map((r) => r.chat_id);
    for (const cid of chatIds) socket.join(`chat:${cid}`);

    socket.on('chat:join', (chatId: string) => {
      if (typeof chatId === 'string' && isMember(chatId, uid)) socket.join(`chat:${chatId}`);
    });

    socket.on(
      'message:send',
      (
        payload: { chatId: string; body: string; replyTo?: string | null; tempId?: string },
        ack?: (resp: { ok: boolean; message?: unknown; tempId?: string; error?: string }) => void,
      ) => {
        try {
          if (!payload?.chatId || typeof payload.body !== 'string') {
            ack?.({ ok: false, error: 'invalid' });
            return;
          }
          const body = payload.body.trim();
          if (!body || body.length > 4000) {
            ack?.({ ok: false, error: 'invalid body' });
            return;
          }
          if (!isMember(payload.chatId, uid)) {
            ack?.({ ok: false, error: 'forbidden' });
            return;
          }
          const id = nanoid(14);
          const now = Date.now();
          db.prepare(
            `INSERT INTO messages (id, chat_id, author_id, body, reply_to, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(id, payload.chatId, uid, body, payload.replyTo ?? null, now);
          db.prepare('UPDATE chats SET last_message_at = ? WHERE id = ?').run(now, payload.chatId);

          const message = {
            id,
            chatId: payload.chatId,
            authorId: uid,
            body,
            replyTo: payload.replyTo ?? null,
            editedAt: null,
            deletedAt: null,
            createdAt: now,
            reactions: [],
          };
          io.to(`chat:${payload.chatId}`).emit('message:new', message);

          // Update chat list previews for all members
          const chatRow = db
            .prepare<[string], ChatRow>('SELECT * FROM chats WHERE id = ?')
            .get(payload.chatId);
          if (chatRow) {
            for (const memberId of chatMemberIds(payload.chatId)) {
              io.to(`user:${memberId}`).emit('chat:updated', chatToListItem(chatRow, memberId));
            }
          }
          ack?.({ ok: true, message, tempId: payload.tempId });
        } catch (err) {
          console.error('message:send error', err);
          ack?.({ ok: false, error: 'server error' });
        }
      },
    );

    socket.on('message:edit', (payload: { id: string; body: string }) => {
      const row = db
        .prepare<[string], MessageRow>('SELECT * FROM messages WHERE id = ?')
        .get(payload.id);
      if (!row || row.author_id !== uid || row.deleted_at) return;
      const body = String(payload.body || '').trim();
      if (!body || body.length > 4000) return;
      const now = Date.now();
      db.prepare('UPDATE messages SET body = ?, edited_at = ? WHERE id = ?').run(body, now, payload.id);
      io.to(`chat:${row.chat_id}`).emit('message:edited', { id: row.id, chatId: row.chat_id, body, editedAt: now });
    });

    socket.on('message:delete', (payload: { id: string }) => {
      const row = db
        .prepare<[string], MessageRow>('SELECT * FROM messages WHERE id = ?')
        .get(payload.id);
      if (!row || row.author_id !== uid) return;
      const now = Date.now();
      db.prepare('UPDATE messages SET deleted_at = ?, body = ? WHERE id = ?').run(now, '', payload.id);
      io.to(`chat:${row.chat_id}`).emit('message:deleted', { id: row.id, chatId: row.chat_id });
    });

    socket.on('reaction:toggle', (payload: { messageId: string; emoji: string }) => {
      const emoji = String(payload?.emoji ?? '').slice(0, 8);
      if (!emoji) return;
      const row = db
        .prepare<[string], MessageRow>('SELECT * FROM messages WHERE id = ?')
        .get(payload.messageId);
      if (!row || !isMember(row.chat_id, uid)) return;
      const existing = db
        .prepare('SELECT 1 FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
        .get(payload.messageId, uid, emoji);
      if (existing) {
        db.prepare('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').run(
          payload.messageId,
          uid,
          emoji,
        );
      } else {
        db.prepare(
          'INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)',
        ).run(payload.messageId, uid, emoji, Date.now());
      }
      const reactions = db
        .prepare<[string], { user_id: string; emoji: string }>(
          'SELECT user_id, emoji FROM reactions WHERE message_id = ?',
        )
        .all(payload.messageId);
      io.to(`chat:${row.chat_id}`).emit('reaction:updated', {
        id: payload.messageId,
        chatId: row.chat_id,
        reactions: reactions.map((r) => ({ userId: r.user_id, emoji: r.emoji })),
      });
    });

    socket.on('typing', (payload: { chatId: string; typing: boolean }) => {
      if (!payload?.chatId || !isMember(payload.chatId, uid)) return;
      const u = db
        .prepare<[string], UserRow>('SELECT display_name FROM users WHERE id = ?')
        .get(uid);
      socket.to(`chat:${payload.chatId}`).emit('typing', {
        chatId: payload.chatId,
        userId: uid,
        displayName: u?.display_name ?? '',
        typing: !!payload.typing,
      });
    });

    socket.on('chat:read', (chatId: string) => {
      if (typeof chatId !== 'string' || !isMember(chatId, uid)) return;
      db.prepare(
        'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?',
      ).run(Date.now(), chatId, uid);
      io.to(`chat:${chatId}`).emit('chat:read', { chatId, userId: uid, at: Date.now() });
    });

    socket.on('disconnect', () => {
      const list = onlineUsers.get(uid);
      if (list) {
        list.delete(socket.id);
        if (list.size === 0) {
          onlineUsers.delete(uid);
          db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), uid);
          broadcastPresence(uid, false);
        }
      }
    });

    socket.emit('hello', { uid, ts: Date.now() });
  });

  function broadcastPresence(userId: string, online: boolean): void {
    const chatIds = db
      .prepare<[string], { chat_id: string }>('SELECT chat_id FROM chat_members WHERE user_id = ?')
      .all(userId)
      .map((r) => r.chat_id);
    const at = Date.now();
    for (const cid of chatIds) {
      io.to(`chat:${cid}`).emit('presence', { userId, online, lastSeen: at });
    }
  }

  return io;
}

export function isUserOnline(uid: string): boolean {
  return (onlineUsers.get(uid)?.size ?? 0) > 0;
}
