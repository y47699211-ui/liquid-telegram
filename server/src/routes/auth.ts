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
  const avatarColor = randomAvatarColor();
  db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, avatar_color, bio, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, username, displayName, passwordHash, avatarColor, '', now, now);
  const token = signToken({ uid: id, username });
  res.json({
    token,
    user: serializeUser(db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id)!),
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
  res.json({ token, user: serializeUser(row) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.user!.uid);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ user: serializeUser(row) });
});

export function serializeUser(row: UserRow) {
  let links: { label: string; url: string }[] = [];
  try {
    const parsed = JSON.parse(row.links || '[]');
    if (Array.isArray(parsed)) links = parsed;
  } catch {
    links = [];
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    statusEmoji: row.status_emoji,
    statusText: row.status_text,
    accentColor: row.accent_color,
    links,
    onboarded: !!row.onboarded,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
  };
}

const updateSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(280).optional(),
  statusEmoji: z.string().max(8).optional(),
  statusText: z.string().max(60).optional(),
  accentColor: z.string().max(120).optional(),
  avatarUrl: z.string().max(300).nullable().optional(),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        url: z.string().min(1).max(200),
      }),
    )
    .max(6)
    .optional(),
  onboarded: z.boolean().optional(),
});

authRouter.patch('/me', requireAuth, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  const data = parsed.data;
  if (data.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(data.displayName);
  }
  if (data.bio !== undefined) {
    fields.push('bio = ?');
    values.push(data.bio);
  }
  if (data.statusEmoji !== undefined) {
    fields.push('status_emoji = ?');
    values.push(data.statusEmoji);
  }
  if (data.statusText !== undefined) {
    fields.push('status_text = ?');
    values.push(data.statusText);
  }
  if (data.accentColor !== undefined) {
    fields.push('accent_color = ?');
    values.push(data.accentColor);
  }
  if (data.avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    values.push(data.avatarUrl);
  }
  if (data.links !== undefined) {
    fields.push('links = ?');
    values.push(JSON.stringify(data.links));
  }
  if (data.onboarded !== undefined) {
    fields.push('onboarded = ?');
    values.push(data.onboarded ? 1 : 0);
  }
  if (fields.length === 0) {
    res.json({ ok: true });
    return;
  }
  values.push(req.user!.uid);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.user!.uid)!;
  res.json({ user: serializeUser(row) });
});
