import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, type ChatRow, type MessageRow, type ReactionRow, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

interface ChatListItem {
  id: string;
  type: 'direct' | 'group' | 'channel';
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
  members: Array<{ id: string; username: string; displayName: string; avatarColor: string; lastSeen: number }>;
}

function loadChatMembers(chatId: string): UserRow[] {
  return db
    .prepare<[string], UserRow>(
      `SELECT u.* FROM users u JOIN chat_members m ON m.user_id = u.id WHERE m.chat_id = ?`,
    )
    .all(chatId);
}

function chatToListItem(chat: ChatRow, viewerId: string): ChatListItem {
  const members = loadChatMembers(chat.id);
  const lastMsg = db
    .prepare<[string], MessageRow>(
      `SELECT * FROM messages WHERE chat_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    )
    .get(chat.id);
  const lastAuthor = lastMsg ? members.find((m) => m.id === lastMsg.author_id) : undefined;

  const memberRow = db
    .prepare<[string, string], { last_read_at: number }>(
      'SELECT last_read_at FROM chat_members WHERE chat_id = ? AND user_id = ?',
    )
    .get(chat.id, viewerId);
  const lastReadAt = memberRow?.last_read_at ?? 0;
  const unread = db
    .prepare<[string, number, string], { c: number }>(
      `SELECT COUNT(*) AS c FROM messages WHERE chat_id = ? AND created_at > ? AND author_id != ? AND deleted_at IS NULL`,
    )
    .get(chat.id, lastReadAt, viewerId)?.c ?? 0;

  let title = chat.title ?? '';
  let avatarColor = chat.avatar_color ?? '';
  if (chat.type === 'direct') {
    const other = members.find((m) => m.id !== viewerId) ?? members[0];
    title = other?.display_name ?? 'Direct';
    avatarColor = other?.avatar_color ?? '';
  }

  return {
    id: chat.id,
    type: chat.type,
    title,
    avatarColor,
    lastMessage: lastMsg
      ? {
          id: lastMsg.id,
          body: lastMsg.body,
          authorId: lastMsg.author_id,
          authorName: lastAuthor?.display_name ?? '',
          createdAt: lastMsg.created_at,
        }
      : null,
    lastMessageAt: chat.last_message_at,
    unread,
    members: members.map((m) => ({
      id: m.id,
      username: m.username,
      displayName: m.display_name,
      avatarColor: m.avatar_color,
      lastSeen: m.last_seen,
    })),
  };
}

chatsRouter.get('/', (req, res) => {
  const uid = req.user!.uid;
  const chats = db
    .prepare<[string], ChatRow>(
      `SELECT c.* FROM chats c JOIN chat_members m ON m.chat_id = c.id
       WHERE m.user_id = ? ORDER BY c.last_message_at DESC, c.created_at DESC`,
    )
    .all(uid);
  res.json({ chats: chats.map((c) => chatToListItem(c, uid)) });
});

const createSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('direct'), userId: z.string() }),
  z.object({
    type: z.literal('group'),
    title: z.string().min(1).max(60),
    userIds: z.array(z.string()).min(1).max(50),
  }),
  z.object({
    type: z.literal('channel'),
    title: z.string().min(1).max(60),
    userIds: z.array(z.string()).optional(),
  }),
]);

chatsRouter.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const uid = req.user!.uid;
  const data = parsed.data;
  const now = Date.now();

  if (data.type === 'direct') {
    if (data.userId === uid) {
      res.status(400).json({ error: 'cannot DM yourself' });
      return;
    }
    const other = db.prepare('SELECT id FROM users WHERE id = ?').get(data.userId);
    if (!other) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    const existing = db
      .prepare<[string, string], { id: string }>(
        `SELECT c.id FROM chats c
         JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = ?
         JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = ?
         WHERE c.type = 'direct' LIMIT 1`,
      )
      .get(uid, data.userId);
    if (existing) {
      const row = db.prepare<[string], ChatRow>('SELECT * FROM chats WHERE id = ?').get(existing.id)!;
      res.json({ chat: chatToListItem(row, uid) });
      return;
    }
    const id = nanoid(12);
    db.prepare(
      `INSERT INTO chats (id, type, title, avatar_color, created_by, created_at, last_message_at)
       VALUES (?, 'direct', NULL, NULL, ?, ?, ?)`,
    ).run(id, uid, now, now);
    const insertMember = db.prepare(
      `INSERT INTO chat_members (chat_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, ?, ?, 0)`,
    );
    insertMember.run(id, uid, 'member', now);
    insertMember.run(id, data.userId, 'member', now);
    const row = db.prepare<[string], ChatRow>('SELECT * FROM chats WHERE id = ?').get(id)!;
    res.json({ chat: chatToListItem(row, uid) });
    return;
  }

  const id = nanoid(12);
  const colors = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f6d365,#fda085)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  db.prepare(
    `INSERT INTO chats (id, type, title, avatar_color, created_by, created_at, last_message_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, data.type, data.title, color, uid, now, now);
  const insertMember = db.prepare(
    `INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, ?, ?, 0)`,
  );
  insertMember.run(id, uid, 'owner', now);
  for (const userId of data.userIds ?? []) {
    if (userId !== uid) insertMember.run(id, userId, 'member', now);
  }
  const row = db.prepare<[string], ChatRow>('SELECT * FROM chats WHERE id = ?').get(id)!;
  res.json({ chat: chatToListItem(row, uid) });
});

function isMember(chatId: string, userId: string): boolean {
  const row = db
    .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
    .get(chatId, userId);
  return !!row;
}

chatsRouter.get('/:chatId/messages', (req, res) => {
  const uid = req.user!.uid;
  const chatId = req.params.chatId;
  if (!isMember(chatId, uid)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const before = Number(req.query.before ?? Date.now());
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const rows = db
    .prepare<[string, number, number], MessageRow>(
      `SELECT * FROM messages WHERE chat_id = ? AND created_at < ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(chatId, before, limit);
  const messageIds = rows.map((r) => r.id);
  let reactions: ReactionRow[] = [];
  if (messageIds.length) {
    const placeholders = messageIds.map(() => '?').join(',');
    reactions = db
      .prepare<string[], ReactionRow>(
        `SELECT * FROM reactions WHERE message_id IN (${placeholders})`,
      )
      .all(...messageIds);
  }
  res.json({
    messages: rows
      .map((r) => ({
        id: r.id,
        chatId: r.chat_id,
        authorId: r.author_id,
        body: r.body,
        replyTo: r.reply_to,
        editedAt: r.edited_at,
        deletedAt: r.deleted_at,
        createdAt: r.created_at,
        reactions: reactions
          .filter((rx) => rx.message_id === r.id)
          .map((rx) => ({ userId: rx.user_id, emoji: rx.emoji })),
      }))
      .reverse(),
  });
});

chatsRouter.post('/:chatId/read', (req, res) => {
  const uid = req.user!.uid;
  const chatId = req.params.chatId;
  if (!isMember(chatId, uid)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  db.prepare('UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?').run(
    Date.now(),
    chatId,
    uid,
  );
  res.json({ ok: true });
});

export { chatToListItem };
