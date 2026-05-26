import { Router } from 'express';
import { db, type NotificationRow, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { serializeUser } from './auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

interface SerializedNotification {
  id: string;
  type: string;
  body: string;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: number;
  actor: ReturnType<typeof serializeUser> | null;
}

function serializeNotification(row: NotificationRow): SerializedNotification {
  let actor = null;
  if (row.actor_id) {
    const actorRow = db
      .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
      .get(row.actor_id);
    if (actorRow) actor = serializeUser(actorRow);
  }
  return {
    id: row.id,
    type: row.type,
    body: row.body,
    targetId: row.target_id,
    targetType: row.target_type,
    read: !!row.read,
    createdAt: row.created_at,
    actor,
  };
}

notificationsRouter.get('/', (req, res) => {
  const rows = db
    .prepare<[string], NotificationRow>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    )
    .all(req.user!.uid);
  const unread = db
    .prepare<[string], { c: number }>(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0',
    )
    .get(req.user!.uid)?.c ?? 0;
  res.json({ notifications: rows.map(serializeNotification), unread });
});

notificationsRouter.post('/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user!.uid);
  res.json({ ok: true });
});

notificationsRouter.post('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user!.uid,
  );
  res.json({ ok: true });
});
