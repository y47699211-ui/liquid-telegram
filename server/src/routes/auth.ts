import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, type UserRow } from '../db.js';
import { randomAvatarColor, requireAuth, signToken } from '../auth.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'username can contain letters, digits and underscores only'),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(40).optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid input' });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const displayName = parsed.data.displayName?.trim() || username;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'username already taken' });
    return;
  }
  const id = nanoid(12);
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, avatar_color, bio, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, username, displayName, passwordHash, randomAvatarColor(), '', now, now);
  const token = signToken({ uid: id, username });
  res.json({
    token,
    user: { id, username, displayName, avatarColor: db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id)!.avatar_color, bio: '' },
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = credentialsSchema.pick({ username: true, password: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const row = db.prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, row.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), row.id);
  const token = signToken({ uid: row.id, username: row.username });
  res.json({
    token,
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      bio: row.bio,
    },
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.user!.uid);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      bio: row.bio,
    },
  });
});

const updateSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(200).optional(),
});

authRouter.patch('/me', requireAuth, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(parsed.data.displayName);
  }
  if (parsed.data.bio !== undefined) {
    fields.push('bio = ?');
    values.push(parsed.data.bio);
  }
  if (fields.length === 0) {
    res.json({ ok: true });
    return;
  }
  values.push(req.user!.uid);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});
