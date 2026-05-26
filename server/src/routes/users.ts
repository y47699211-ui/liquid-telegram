import { Router } from 'express';
import { db, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';

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
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarColor: r.avatar_color,
      bio: r.bio,
      lastSeen: r.last_seen,
    })),
  });
});

usersRouter.get('/:id', (req, res) => {
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.params.id);
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
      lastSeen: row.last_seen,
    },
  });
});
