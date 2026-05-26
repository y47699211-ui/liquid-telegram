# Liquid Telegram

A real-time messaging app with a **Liquid Glass** aesthetic — translucent surfaces, frosted blur, glowing gradients, and animated background orbs. Telegram-style chats, groups and channels, all powered by WebSockets.

![liquid-telegram](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-7C5CFF) ![ws](https://img.shields.io/badge/realtime-Socket.io-22D3EE) ![db](https://img.shields.io/badge/db-SQLite-444)

## Features

- **Real-time messaging** over WebSocket (Socket.io) — instant delivery, typing indicators, online presence, read receipts.
- **Direct, group and channel chats**, member management, user search.
- **Reactions, replies, edits, deletes** with animated transitions.
- **Auth**: register/login with JWT and bcrypt-hashed passwords.
- **Liquid Glass UI**: backdrop-filter, layered blur, specular highlights, animated background orbs (Framer Motion).
- **Dark / light themes**, smooth springy interactions.
- **Persistent**: SQLite via better-sqlite3 (single-file DB, WAL mode).

## Stack

| Layer    | Tech |
| -------- | ---- |
| Frontend | React 18, Vite, TypeScript, TailwindCSS, Framer Motion, Zustand, React Router, socket.io-client |
| Backend  | Node 22, Express, Socket.io, better-sqlite3, JWT, bcryptjs, Zod, nanoid |

## Repository layout

```
/
├── client/          # Vite + React + TS frontend (Liquid Glass UI)
│   └── src/
│       ├── components/   # Sidebar, Conversation, modals, Background, Avatar
│       ├── pages/        # AuthPage, ChatPage
│       ├── api.ts        # REST client
│       ├── socket.ts     # Socket.io client
│       └── store.ts      # Zustand store
├── server/          # Node + Express + Socket.io backend
│   └── src/
│       ├── routes/       # /api/auth, /api/users, /api/chats
│       ├── socket.ts     # Realtime event handlers
│       ├── db.ts         # SQLite schema + connection
│       └── auth.ts       # JWT helpers
└── data/            # SQLite DB lives here (auto-created, gitignored)
```

## Quick start

```bash
# install deps (root + workspaces)
npm install

# run server (4000) + client (5173) together
npm run dev

# or separately
npm run dev:server
npm run dev:client
```

Open http://localhost:5173 and register a couple of accounts in two browser windows to see realtime messaging in action.

## Environment

The server reads:

| Var          | Default                              | Notes |
| ------------ | ------------------------------------ | ----- |
| `PORT`       | `4000`                               | HTTP + WS port |
| `JWT_SECRET` | `liquid-glass-dev-secret-change-me`  | **Change in production.** |

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:4000`.

## Production build

```bash
npm run build           # builds the client into client/dist
npm run start --workspace server   # runs the server (serves API + WS)
```

For production, serve `client/dist` from any static host or behind the same Express instance.

## Liquid Glass design tokens

The look is driven by CSS variables defined in [`client/src/styles/index.css`](client/src/styles/index.css):

- `--glass-bg`, `--glass-border`, `--glass-highlight` — translucent surface stack
- `backdrop-filter: blur(28px) saturate(180%)` — the core "glass" effect
- Animated radial-gradient orbs (`<Background />`) drift slowly behind the UI
- Gradient avatars and accent buttons use the same purple→cyan palette as Liquid Glass

## License

MIT
