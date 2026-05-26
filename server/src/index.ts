import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { chatsRouter } from './routes/chats.js';
import { setupSocket } from './socket.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'liquid-telegram', time: Date.now() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/chats', chatsRouter);

const server = http.createServer(app);
setupSocket(server);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`[liquid-telegram] server listening on http://localhost:${PORT}`);
});
