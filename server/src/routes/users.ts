import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { serializeUser } from './auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  if (!q) {
    res.json({ users: [] });
    return;
  }
  const rows = db
    .prepare<[string, string, string], UserRow>(
      `SELECT * FROM users
       WHERE id != ? AND (username LIKE ? OR LOWER(display_name) LIKE ?)
       ORDER BY username ASC LIMIT 20`,
    )
    .all(req.user!.uid, `%${q}%`, `%${q}%`);
  res.json({ users: rows.map(serializeUser) });
});

usersRouter.get('/:id', (req, res) => {
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const me = req.user!.uid;
  const followers = db
    .prepare<[string], { c: number }>('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?')
    .get(row.id)?.c ?? 0;
  const following = db
    .prepare<[string], { c: number }>('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?')
    .get(row.id)?.c ?? 0;
  const isFollowing = !!db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?')
    .get(me, row.id);
  const followsYou = !!db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?')
    .get(row.id, me);
  res.json({
    user: serializeUser(row),
    followers,
    following,
    isFollowing,
    followsYou,
  });
});

usersRouter.post('/:id/follow', (req, res) => {
  const me = req.user!.uid;
  const target = req.params.id;
  if (me === target) {
    res.status(400).json({ error: 'cannot follow yourself' });
    return;
  }
  const targetRow = db.prepare('SELECT id FROM users WHERE id = ?').get(target);
  if (!targetRow) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  db.prepare(
    'INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)',
  ).run(me, target, Date.now());
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, actor_id, target_id, target_type, created_at)
     VALUES (?, ?, 'follow', ?, NULL, NULL, ?)`,
  ).run(nanoid(14), target, me, Date.now());
  res.json({ ok: true });
});

usersRouter.delete('/:id/follow', (req, res) => {
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(
    req.user!.uid,
    req.params.id,
  );
  res.json({ ok: true });
});

usersRouter.get('/:id/followers', (req, res) => {
  const rows = db
    .prepare<[string], UserRow>(
      `SELECT u.* FROM users u JOIN follows f ON f.follower_id = u.id
       WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    )
    .all(req.params.id);
  res.json({ users: rows.map(serializeUser) });
});

usersRouter.get('/:id/following', (req, res) => {
  const rows = db
    .prepare<[string], UserRow>(
      `SELECT u.* FROM users u JOIN follows f ON f.followee_id = u.id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    )
    .all(req.params.id);
  res.json({ users: rows.map(serializeUser) });
});
