import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import { useStore } from '../store';
import Avatar from './Avatar';
import type { User } from '../types';
import clsx from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'direct' | 'group' | 'channel';

export default function NewChatModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const upsertChat = useStore((s) => s.upsertChat);
  const setActiveChat = useStore((s) => s.setActiveChat);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected([]);
      setTitle('');
      setTab('direct');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const { users } = await api.searchUsers(query.trim());
        setResults(users);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query, open]);

  const create = async () => {
    setCreating(true);
    try {
      let chat;
      if (tab === 'direct' && selected[0]) {
        chat = (await api.createDirect(selected[0].id)).chat;
      } else if (tab === 'group' && selected.length > 0 && title.trim()) {
        chat = (await api.createGroup(title.trim(), selected.map((u) => u.id))).chat;
      } else if (tab === 'channel' && title.trim()) {
        chat = (await api.createChannel(title.trim(), selected.map((u) => u.id))).chat;
      }
      if (chat) {
        upsertChat(chat);
        setActiveChat(chat.id);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const canCreate =
    (tab === 'direct' && selected.length === 1) ||
    (tab === 'group' && selected.length >= 1 && title.trim().length > 0) ||
    (tab === 'channel' && title.trim().length > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 250 }}
            className="glass w-full max-w-md rounded-[28px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Start new conversation</h2>
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
              {(['direct', 'group', 'channel'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    'relative rounded-xl px-3 py-2 text-sm font-medium transition',
                    tab === t ? 'text-white' : 'text-white/55 hover:text-white',
                  )}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/50 to-accent-glow/40"
                      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{t}</span>
                </button>
              ))}
            </div>

            {(tab === 'group' || tab === 'channel') && (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tab === 'group' ? 'Group name' : 'Channel name'}
                className="glass-soft mb-2 w-full rounded-xl px-4 py-2.5 text-sm"
              />
            )}

            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelected(selected.filter((s) => s.id !== u.id))}
                    className="flex items-center gap-1.5 rounded-full bg-accent/30 px-2 py-1 text-xs"
                  >
                    {u.displayName}
                    <span>×</span>
                  </button>
                ))}
              </div>
            )}

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="glass-soft mb-2 w-full rounded-xl px-4 py-2.5 text-sm"
            />

            <div className="scroll-thin max-h-60 overflow-y-auto">
              {results.length === 0 && query.trim() && (
                <div className="py-3 text-center text-xs text-white/40">No users found.</div>
              )}
              {results.map((u) => {
                const sel = selected.some((s) => s.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (tab === 'direct') {
                        setSelected([u]);
                      } else {
                        setSelected(sel ? selected.filter((s) => s.id !== u.id) : [...selected, u]);
                      }
                    }}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition',
                      sel ? 'bg-accent/25' : 'hover:bg-white/5',
                    )}
                  >
                    <Avatar name={u.displayName} color={u.avatarColor} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{u.displayName}</div>
                      <div className="truncate text-xs text-white/45">@{u.username}</div>
                    </div>
                    {sel && (
                      <div className="rounded-full bg-accent p-1">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10">
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={!canCreate || creating}
                onClick={create}
                className="rounded-2xl bg-gradient-to-br from-accent to-accent-glow px-5 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
              >
                {creating ? '…' : 'Create'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
