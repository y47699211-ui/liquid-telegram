import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { chatsRouter } from './routes/chats.js';
import { postsRouter } from './routes/posts.js';
import { storiesRouter } from './routes/stories.js';
import { notificationsRouter } from './routes/notifications.js';
import { uploadsRouter, uploadsDir } from './routes/uploads.js';
import { setupSocket } from './socket.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aurora', time: Date.now() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/uploads', uploadsRouter);
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    immutable: true,
  }),
);

const server = http.createServer(app);
setupSocket(server);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`[aurora] server listening on http://localhost:${PORT}`);
});
