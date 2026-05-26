import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, type PostRow, type PostCommentRow, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { serializeUser } from './auth.js';
import { emitToUser } from '../socket.js';

export const postsRouter = Router();
postsRouter.use(requireAuth);

const createSchema = z.object({
  body: z.string().min(1).max(2000),
  imageUrl: z.string().max(300).nullable().optional(),
});

interface SerializedPost {
  id: string;
  body: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: number;
  liked: boolean;
  author: ReturnType<typeof serializeUser>;
}

function serializePost(row: PostRow, viewerId: string): SerializedPost {
  const author = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(row.author_id)!;
  const liked = !!db
    .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
    .get(row.id, viewerId);
  return {
    id: row.id,
    body: row.body,
    imageUrl: row.image_url,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    liked,
    author: serializeUser(author),
  };
}

postsRouter.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const id = nanoid(14);
  const now = Date.now();
  db.prepare(
    `INSERT INTO posts (id, author_id, body, image_url, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.user!.uid, parsed.data.body, parsed.data.imageUrl ?? null, now);
  const row = db.prepare<[string], PostRow>('SELECT * FROM posts WHERE id = ?').get(id)!;
  res.json({ post: serializePost(row, req.user!.uid) });
});

postsRouter.get('/feed', (req, res) => {
  const me = req.user!.uid;
  const before = Number(req.query.before ?? Date.now());
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const rows = db
    .prepare<[string, string, number, number], PostRow>(
      `SELECT p.* FROM posts p
       WHERE (p.author_id = ?
              OR p.author_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
         AND p.created_at < ?
       ORDER BY p.created_at DESC LIMIT ?`,
    )
    .all(me, me, before, limit);
  res.json({ posts: rows.map((r) => serializePost(r, me)) });
});

postsRouter.get('/discover', (req, res) => {
  const me = req.user!.uid;
  const before = Number(req.query.before ?? Date.now());
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const rows = db
    .prepare<[number, number], PostRow>(
      `SELECT * FROM posts WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(before, limit);
  res.json({ posts: rows.map((r) => serializePost(r, me)) });
});

postsRouter.get('/user/:userId', (req, res) => {
  const me = req.user!.uid;
  const rows = db
    .prepare<[string], PostRow>(
      `SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(req.params.userId);
  res.json({ posts: rows.map((r) => serializePost(r, me)) });
});

postsRouter.post('/:id/like', (req, res) => {
  const me = req.user!.uid;
  const postId = req.params.id;
  const post = db.prepare<[string], PostRow>('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const existing = db
    .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
    .get(postId, me);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, me);
    db.prepare('UPDATE posts SET like_count = MAX(like_count - 1, 0) WHERE id = ?').run(postId);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(
      postId,
      me,
      Date.now(),
    );
    db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').run(postId);
    if (post.author_id !== me) {
      const notifId = nanoid(14);
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, actor_id, target_id, target_type, created_at)
         VALUES (?, ?, 'like', ?, ?, 'post', ?)`,
      ).run(notifId, post.author_id, me, postId, Date.now());
      emitToUser(post.author_id, 'notification:new', { id: notifId });
    }
  }
  const row = db.prepare<[string], PostRow>('SELECT * FROM posts WHERE id = ?').get(postId)!;
  res.json({ post: serializePost(row, me) });
});

const commentSchema = z.object({ body: z.string().min(1).max(500) });

postsRouter.post('/:id/comments', (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const me = req.user!.uid;
  const postId = req.params.id;
  const post = db.prepare<[string], PostRow>('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const id = nanoid(14);
  const now = Date.now();
  db.prepare(
    `INSERT INTO post_comments (id, post_id, author_id, body, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, postId, me, parsed.data.body, now);
  db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);
  if (post.author_id !== me) {
    const notifId = nanoid(14);
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, actor_id, target_id, target_type, body, created_at)
       VALUES (?, ?, 'comment', ?, ?, 'post', ?, ?)`,
    ).run(notifId, post.author_id, me, postId, parsed.data.body.slice(0, 80), now);
    emitToUser(post.author_id, 'notification:new', { id: notifId });
  }
  const author = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(me)!;
  res.json({
    comment: {
      id,
      postId,
      body: parsed.data.body,
      createdAt: now,
      author: serializeUser(author),
    },
  });
});

postsRouter.get('/:id/comments', (req, res) => {
  const rows = db
    .prepare<[string], PostCommentRow>(
      `SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 200`,
    )
    .all(req.params.id);
  const comments = rows.map((c) => {
    const author = db
      .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
      .get(c.author_id)!;
    return {
      id: c.id,
      postId: c.post_id,
      body: c.body,
      createdAt: c.created_at,
      author: serializeUser(author),
    };
  });
  res.json({ comments });
});

postsRouter.delete('/:id', (req, res) => {
  const me = req.user!.uid;
  const post = db
    .prepare<[string], PostRow>('SELECT * FROM posts WHERE id = ?')
    .get(req.params.id);
  if (!post || post.author_id !== me) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export { serializePost };
