import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useStore } from '../store';
import { api } from '../api';
import Avatar from './Avatar';
import { relativeTime } from '../utils';
import type { ChatPreview, User } from '../types';

interface Props {
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
}

export default function Sidebar({ onOpenSettings, onOpenNewChat }: Props) {
  const me = useStore((s) => s.user);
  const chats = useStore((s) => s.chats);
  const activeChatId = useStore((s) => s.activeChatId);
  const setActiveChat = useStore((s) => s.setActiveChat);
  const online = useStore((s) => s.onlineUsers);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const { users } = await api.searchUsers(query.trim());
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  const filteredChats = query.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    : chats;

  const openDirect = async (user: User) => {
    try {
      const { chat } = await api.createDirect(user.id);
      useStore.getState().upsertChat(chat);
      setActiveChat(chat.id);
      setQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className="glass relative flex w-[340px] shrink-0 flex-col rounded-[28px] m-3 mr-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-white/5"
        >
          <Avatar name={me?.displayName ?? '?'} color={me?.avatarColor ?? ''} size={40} />
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">{me?.displayName}</div>
            <div className="text-[11px] text-white/50">@{me?.username}</div>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <IconButton onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </IconButton>
          <IconButton onClick={onOpenNewChat} title="New chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="glass-soft flex items-center gap-2 rounded-2xl px-3 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users or chats…"
            className="flex-1 bg-transparent text-sm placeholder:text-white/30"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-white/40 transition hover:text-white"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        <AnimatePresence>
          {query.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2"
            >
              <SectionLabel>Users {searching ? '…' : ''}</SectionLabel>
              {searchResults.length === 0 && !searching && (
                <div className="px-3 py-2 text-xs text-white/40">No users found.</div>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openDirect(u)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/5"
                >
                  <Avatar name={u.displayName} color={u.avatarColor} size={38} online={online[u.id]} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.displayName}</div>
                    <div className="truncate text-xs text-white/45">@{u.username}</div>
                  </div>
                </button>
              ))}
              {filteredChats.length > 0 && <SectionLabel>Chats</SectionLabel>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1">
          {filteredChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={activeChatId === chat.id}
              online={online}
              onClick={() => setActiveChat(chat.id)}
            />
          ))}
          {!filteredChats.length && !query.trim() && (
            <div className="px-3 py-10 text-center text-sm text-white/40">
              No chats yet.
              <br />
              Click <span className="text-accent-light">+</span> to start one.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function ChatRow({
  chat,
  active,
  online,
  onClick,
}: {
  chat: ChatPreview;
  active: boolean;
  online: Record<string, boolean>;
  onClick: () => void;
}) {
  const me = useStore((s) => s.user);
  const otherMember = chat.type === 'direct' ? chat.members.find((m) => m.id !== me?.id) : null;
  const isOnline = otherMember ? online[otherMember.id] : undefined;
  const preview = chat.lastMessage
    ? (chat.type !== 'direct' && chat.lastMessage.authorId === me?.id
        ? `You: ${chat.lastMessage.body}`
        : chat.type !== 'direct'
          ? `${chat.lastMessage.authorName.split(' ')[0]}: ${chat.lastMessage.body}`
          : chat.lastMessage.body)
    : 'No messages yet';

  const typing = useStore((s) => s.typingByChat[chat.id] ?? []).filter((t) => t.userId !== me?.id);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition',
        active
          ? 'bg-gradient-to-r from-accent/30 to-accent-glow/10 shadow-inner'
          : 'hover:bg-white/5',
      )}
    >
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 rounded-2xl ring-1 ring-white/20"
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        />
      )}
      <Avatar
        name={chat.title}
        color={chat.avatarColor}
        size={48}
        online={chat.type === 'direct' ? !!isOnline : undefined}
      />
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{chat.title}</div>
          <div className="text-[10px] text-white/40">
            {chat.lastMessage ? relativeTime(chat.lastMessage.createdAt) : ''}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-xs text-white/55">
            {typing.length > 0 ? (
              <span className="text-accent-light">
                {typing[0].displayName} is typing…
              </span>
            ) : (
              preview
            )}
          </div>
          {chat.unread > 0 && !active && (
            <span className="ml-auto min-w-[20px] rounded-full bg-gradient-to-r from-accent to-accent-glow px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </motion.button>
  );
}
