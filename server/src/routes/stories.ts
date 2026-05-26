import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, type StoryRow, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { serializeUser } from './auth.js';
import { emitToUser } from '../socket.js';

export const storiesRouter = Router();
storiesRouter.use(requireAuth);

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const createSchema = z.object({
  body: z.string().max(280).optional(),
  imageUrl: z.string().max(300).nullable().optional(),
  background: z.string().max(160).optional(),
});

interface SerializedStory {
  id: string;
  body: string;
  imageUrl: string | null;
  background: string;
  createdAt: number;
  expiresAt: number;
  author: ReturnType<typeof serializeUser>;
  views: number;
  viewed: boolean;
}

function serializeStory(row: StoryRow, viewerId: string): SerializedStory {
  const author = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(row.author_id)!;
  const views = db
    .prepare<[string], { c: number }>('SELECT COUNT(*) AS c FROM story_views WHERE story_id = ?')
    .get(row.id)?.c ?? 0;
  const viewed = !!db
    .prepare('SELECT 1 FROM story_views WHERE story_id = ? AND viewer_id = ?')
    .get(row.id, viewerId);
  return {
    id: row.id,
    body: row.body,
    imageUrl: row.image_url,
    background: row.background,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    author: serializeUser(author),
    views,
    viewed,
  };
}

function purgeExpired(): void {
  db.prepare('DELETE FROM stories WHERE expires_at < ?').run(Date.now());
}

storiesRouter.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  if (!parsed.data.body && !parsed.data.imageUrl) {
    res.status(400).json({ error: 'story must have text or image' });
    return;
  }
  const id = nanoid(14);
  const now = Date.now();
  db.prepare(
    `INSERT INTO stories (id, author_id, body, image_url, background, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.user!.uid,
    parsed.data.body ?? '',
    parsed.data.imageUrl ?? null,
    parsed.data.background ?? '',
    now,
    now + STORY_TTL_MS,
  );

  // Notify all followers
  const followers = db
    .prepare<[string], { follower_id: string }>(
      'SELECT follower_id FROM follows WHERE followee_id = ?',
    )
    .all(req.user!.uid);
  for (const f of followers) {
    emitToUser(f.follower_id, 'story:new', { authorId: req.user!.uid });
  }

  const row = db.prepare<[string], StoryRow>('SELECT * FROM stories WHERE id = ?').get(id)!;
  res.json({ story: serializeStory(row, req.user!.uid) });
});

storiesRouter.get('/feed', (req, res) => {
  purgeExpired();
  const me = req.user!.uid;
  // Get all stories from people I follow and my own, grouped by author
  const rows = db
    .prepare<[string, string, number], StoryRow>(
      `SELECT s.* FROM stories s
       WHERE s.expires_at > ? AND (s.author_id = ?
         OR s.author_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
       ORDER BY s.created_at ASC`,
    )
    .all(me, me, Date.now());

  const byAuthor = new Map<string, SerializedStory[]>();
  for (const r of rows) {
    const arr = byAuthor.get(r.author_id) ?? [];
    arr.push(serializeStory(r, me));
    byAuthor.set(r.author_id, arr);
  }
  const groups = Array.from(byAuthor.entries()).map(([authorId, stories]) => ({
    authorId,
    author: stories[0].author,
    stories,
    allViewed: stories.every((s) => s.viewed),
    latestAt: Math.max(...stories.map((s) => s.createdAt)),
  }));
  // Sort: self first, then unviewed, then by latest
  const sorted = groups.sort((a, b) => {
    if (a.authorId === me && b.authorId !== me) return -1;
    if (b.authorId === me && a.authorId !== me) return 1;
    if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
    return b.latestAt - a.latestAt;
  });
  res.json({ groups: sorted });
});

storiesRouter.post('/:id/view', (req, res) => {
  const me = req.user!.uid;
  const story = db
    .prepare<[string], StoryRow>('SELECT * FROM stories WHERE id = ?')
    .get(req.params.id);
  if (!story) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  db.prepare(
    'INSERT OR IGNORE INTO story_views (story_id, viewer_id, viewed_at) VALUES (?, ?, ?)',
  ).run(story.id, me, Date.now());
  res.json({ ok: true });
});

storiesRouter.delete('/:id', (req, res) => {
  const me = req.user!.uid;
  const story = db
    .prepare<[string], StoryRow>('SELECT * FROM stories WHERE id = ?')
    .get(req.params.id);
  if (!story || story.author_id !== me) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  res.json({ ok: true });
});

export { serializeStory };
