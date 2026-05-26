# Aurora

A **liquid-glass social platform** that combines a Telegram-grade real-time messenger with a lightweight social manager — stories, posts, follows, profiles and notifications. Built on translucent surfaces, frosted blur, glowing gradients and animated orbs.

> codename `liquid-telegram` — repo name kept for continuity.

![aurora](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-7C5CFF) ![ws](https://img.shields.io/badge/realtime-Socket.io-22D3EE) ![db](https://img.shields.io/badge/db-SQLite-444)

## Features

### Messaging
- **Real-time** over WebSocket (Socket.io) — instant delivery, typing indicators, online presence, read receipts.
- **Direct, group, channel** chats with member management and user search.
- **Reactions, replies, edits, deletes, pins** with animated transitions.
- **Image attachments** and **@mention** autocomplete inside chats.

### Social
- **Rich profiles**: avatar upload, mood emoji + status line, accent gradient, bio, custom links.
- **Posts & feed**: liked / commented timeline, plus a discover tab.
- **Stories**: 24h ephemeral posts with progress bars and view tracking.
- **Follows**: follow / unfollow with follower & following counts.
- **Notifications**: likes, comments, follows, mentions — surfaced in a drawer and via realtime socket events.

### Platform
- **Auth**: register/login with JWT + bcrypt, post-register onboarding flow.
- **Liquid Glass UI**: backdrop-filter, layered blur, specular highlights, animated background orbs (Framer Motion).
- **Dark / light themes**, smooth springy interactions.
- **Persistent**: SQLite via better-sqlite3 (single-file DB, WAL mode).
- **Uploads**: multer-backed `/api/uploads` endpoint for avatars, posts and stories.

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
│       ├── routes/       # /api/auth, /api/users, /api/chats, /api/posts, /api/stories, /api/notifications, /api/uploads
│       ├── socket.ts     # Realtime event handlers
│       ├── db.ts         # SQLite schema + connection
│       └── auth.ts       # JWT helpers
│       └── uploads/      # Multer-managed user uploads (served at /uploads)
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
