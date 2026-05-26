import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useStore } from '../store';
import { api } from '../api';
import { getSocket } from '../socket';
import Avatar from './Avatar';
import { dayLabel, sameDay, timeOfDay } from '../utils';
import type { Message } from '../types';

const REACTION_EMOJIS = ['❤️', '😂', '🔥', '👍', '😮', '😢'];

export default function Conversation() {
  const me = useStore((s) => s.user);
  const activeChatId = useStore((s) => s.activeChatId);
  const chat = useStore((s) => s.chats.find((c) => c.id === activeChatId));
  const messages = useStore((s) => (activeChatId ? s.messagesByChat[activeChatId] ?? [] : []));
  const online = useStore((s) => s.onlineUsers);
  const typing = useStore((s) => (activeChatId ? s.typingByChat[activeChatId] ?? [] : []));
  const appendMessage = useStore((s) => s.appendMessage);
  const replaceMessage = useStore((s) => s.replaceMessage);
  const removeMessage = useStore((s) => s.removeMessage);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Load messages on chat change
  useEffect(() => {
    if (!activeChatId) return;
    const cached = useStore.getState().messagesByChat[activeChatId];
    if (!cached || cached.length === 0) {
      setLoadingHistory(true);
      api
        .loadMessages(activeChatId)
        .then(({ messages }) => useStore.getState().setMessages(activeChatId, messages))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
    api.markRead(activeChatId).catch(() => {});
    getSocket()?.emit('chat:read', activeChatId);
    setReplyTo(null);
    setEditingId(null);
    setDraft('');
  }, [activeChatId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeChatId]);

  // Typing indicator emit (debounced)
  const typingTimer = useRef<number | null>(null);
  const lastTypingEmit = useRef<number>(0);
  const emitTyping = (state: boolean) => {
    if (!activeChatId) return;
    const sock = getSocket();
    if (!sock) return;
    const now = Date.now();
    if (state) {
      if (now - lastTypingEmit.current > 2500) {
        sock.emit('typing', { chatId: activeChatId, typing: true });
        lastTypingEmit.current = now;
      }
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => {
        sock.emit('typing', { chatId: activeChatId, typing: false });
        lastTypingEmit.current = 0;
      }, 3500);
    } else {
      sock.emit('typing', { chatId: activeChatId, typing: false });
      lastTypingEmit.current = 0;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    }
  };

  const send = () => {
    if (!activeChatId || !me) return;
    const body = draft.trim();
    if (!body) return;

    if (editingId) {
      getSocket()?.emit('message:edit', { id: editingId, body });
      setEditingId(null);
      setDraft('');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempMessage: Message = {
      id: tempId,
      chatId: activeChatId,
      authorId: me.id,
      body,
      replyTo: replyTo?.id ?? null,
      editedAt: null,
      deletedAt: null,
      createdAt: Date.now(),
      reactions: [],
      pending: true,
    };
    appendMessage(activeChatId, tempMessage);
    setDraft('');
    setReplyTo(null);
    emitTyping(false);

    getSocket()?.emit(
      'message:send',
      { chatId: activeChatId, body, replyTo: tempMessage.replyTo, tempId },
      (resp: { ok: boolean; message?: Message; tempId?: string; error?: string }) => {
        if (resp?.ok && resp.message && resp.tempId) {
          replaceMessage(activeChatId, resp.tempId, { ...resp.message, pending: false });
        } else {
          removeMessage(activeChatId, tempId);
        }
      },
    );
  };

  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  if (!activeChatId || !chat) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="glass max-w-md rounded-[28px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg,#7C5CFF,#22D3EE)',
              boxShadow: '0 8px 30px rgba(124,92,255,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}>
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Select a chat</h2>
          <p className="mt-1 text-sm text-white/55">Pick a conversation on the left, or start a new one.</p>
        </div>
      </div>
    );
  }

  const otherMember = chat.type === 'direct' ? chat.members.find((m) => m.id !== me?.id) : null;
  const isOnline = otherMember ? online[otherMember.id] : undefined;
  const subtitle =
    chat.type === 'direct'
      ? otherMember
        ? isOnline
          ? 'online'
          : 'last seen ' + new Date(otherMember.lastSeen).toLocaleString()
        : ''
      : `${chat.members.length} member${chat.members.length === 1 ? '' : 's'}`;

  const typingOthers = typing.filter((t) => t.userId !== me?.id);

  return (
    <div className="glass relative flex flex-1 flex-col rounded-[28px] m-3 ml-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
        <Avatar
          name={chat.title}
          color={chat.avatarColor}
          size={42}
          online={chat.type === 'direct' ? !!isOnline : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{chat.title}</div>
          <div className="text-xs text-white/55">
            {typingOthers.length > 0 ? (
              <span className="text-accent-light">
                {typingOthers.map((t) => t.displayName.split(' ')[0]).join(', ')} typing
                <span className="inline-block translate-y-[-2px]">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </span>
            ) : (
              subtitle
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-4 py-4">
        {loadingHistory && (
          <div className="py-6 text-center text-xs text-white/40">Loading messages…</div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="py-10 text-center text-sm text-white/45">
            No messages yet. Say hi 👋
          </div>
        )}
        <AnimatePresence initial={false}>
          {groupedMessages.map((group) => (
            <div key={group.key}>
              <div className="my-4 flex items-center justify-center">
                <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/55 backdrop-blur">
                  {group.label}
                </div>
              </div>
              {group.messages.map((m, idx) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  prevAuthor={group.messages[idx - 1]?.authorId}
                  isOwn={m.authorId === me?.id}
                  members={chat.members}
                  onReply={() => {
                    setReplyTo(m);
                    composerRef.current?.focus();
                  }}
                  onEdit={() => {
                    setEditingId(m.id);
                    setDraft(m.body);
                    composerRef.current?.focus();
                  }}
                  onDelete={() => {
                    getSocket()?.emit('message:delete', { id: m.id });
                  }}
                  onReact={(emoji) => {
                    getSocket()?.emit('reaction:toggle', { messageId: m.id, emoji });
                  }}
                  allMessages={messages}
                />
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 px-3 pb-3 pt-2">
        <AnimatePresence>
          {(replyTo || editingId) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                <div className="h-8 w-1 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-light">
                    {editingId ? 'Editing' : 'Replying to'}
                  </div>
                  <div className="truncate text-xs text-white/65">
                    {editingId
                      ? messages.find((m) => m.id === editingId)?.body
                      : replyTo?.body}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setEditingId(null);
                    setDraft('');
                  }}
                  className="text-white/50 hover:text-white"
                  aria-label="Cancel"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-soft flex items-end gap-2 rounded-3xl px-3 py-2">
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              emitTyping(e.target.value.length > 0);
              const ta = e.target as HTMLTextAreaElement;
              ta.style.height = '0px';
              ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === 'Escape') {
                setReplyTo(null);
                setEditingId(null);
                setDraft('');
              }
            }}
            placeholder={editingId ? 'Edit message…' : 'Message…'}
            className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-white/30"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            disabled={!draft.trim()}
            onClick={send}
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-glow transition',
              draft.trim()
                ? 'bg-gradient-to-br from-accent to-accent-glow'
                : 'cursor-not-allowed bg-white/10',
            )}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 11.5 21 3l-8.5 18-2-8.5L3 11.5z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

interface MessageGroup {
  key: string;
  label: string;
  messages: Message[];
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;
  for (const m of messages) {
    if (!current || !sameDay(current.messages[0].createdAt, m.createdAt)) {
      current = { key: String(m.createdAt), label: dayLabel(m.createdAt), messages: [m] };
      groups.push(current);
    } else {
      current.messages.push(m);
    }
  }
  return groups;
}

interface BubbleProps {
  message: Message;
  prevAuthor?: string;
  isOwn: boolean;
  members: Array<{ id: string; displayName: string; avatarColor: string }>;
  allMessages: Message[];
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

function MessageBubble({
  message,
  prevAuthor,
  isOwn,
  members,
  allMessages,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: BubbleProps) {
  const showAuthor = !isOwn && prevAuthor !== message.authorId;
  const author = members.find((m) => m.id === message.authorId);
  const replyTo = message.replyTo ? allMessages.find((m) => m.id === message.replyTo) : null;
  const replyAuthor = replyTo ? members.find((m) => m.id === replyTo.authorId) : null;
  const [hovered, setHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const me = useStore((s) => s.user);

  const reactionCounts = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of message.reactions) {
      const cur = map.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.userId === me?.id) cur.mine = true;
      map.set(r.emoji, cur);
    }
    return Array.from(map.entries());
  }, [message.reactions, me?.id]);

  if (message.deletedAt) {
    return (
      <div className={clsx('mb-1 flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs italic text-white/40">
          message deleted
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className={clsx(
        'mb-0.5 flex items-end gap-2',
        isOwn ? 'justify-end' : 'justify-start',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowActions(false);
      }}
    >
      {!isOwn && (
        <div className="w-8">
          {showAuthor && author && (
            <Avatar name={author.displayName} color={author.avatarColor} size={28} />
          )}
        </div>
      )}
      <div className={clsx('group relative max-w-[68%]', isOwn ? 'items-end' : 'items-start')}>
        {showAuthor && !isOwn && author && (
          <div className="ml-3 mb-0.5 text-[11px] font-medium text-accent-light">
            {author.displayName}
          </div>
        )}
        <div
          className={clsx(
            'relative rounded-[20px] px-4 py-2 text-sm leading-relaxed shadow-md',
            isOwn
              ? 'rounded-br-[8px] bg-gradient-to-br from-accent/85 to-accent-glow/70 text-white'
              : 'rounded-bl-[8px] bg-white/10 text-white backdrop-blur',
            message.pending && 'opacity-70',
          )}
          style={
            isOwn
              ? {
                  boxShadow: '0 6px 24px rgba(124,92,255,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                }
              : { boxShadow: '0 6px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.10)' }
          }
        >
          {replyTo && (
            <div className="mb-1 rounded-lg border-l-2 border-white/60 bg-white/10 px-2 py-1 text-[11px]">
              <div className="font-semibold text-white/85">{replyAuthor?.displayName ?? '…'}</div>
              <div className="truncate text-white/65">{replyTo.body}</div>
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">{message.body}</div>
          <div
            className={clsx(
              'mt-1 flex items-center justify-end gap-1 text-[10px]',
              isOwn ? 'text-white/75' : 'text-white/50',
            )}
          >
            {message.editedAt && <span>edited</span>}
            <span>{timeOfDay(message.createdAt)}</span>
            {message.pending && <span>· …</span>}
          </div>
        </div>

        {reactionCounts.length > 0 && (
          <div className={clsx('mt-1 flex flex-wrap gap-1', isOwn ? 'justify-end' : 'justify-start')}>
            {reactionCounts.map(([emoji, { count, mine }]) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.9 }}
                onClick={() => onReact(emoji)}
                className={clsx(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 transition',
                  mine
                    ? 'bg-accent/30 text-white ring-accent/60'
                    : 'bg-white/10 text-white/75 ring-white/15 hover:bg-white/15',
                )}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold">{count}</span>
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {(hovered || showActions) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className={clsx(
                'absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-black/55 px-1 py-1 backdrop-blur',
                isOwn ? 'right-full mr-2' : 'left-full ml-2',
              )}
            >
              <ActionBtn onClick={onReply} title="Reply">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
              </ActionBtn>
              <ActionBtn onClick={() => setShowActions((v) => !v)} title="React">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </ActionBtn>
              {isOwn && (
                <>
                  <ActionBtn onClick={onEdit} title="Edit">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </ActionBtn>
                  <ActionBtn onClick={onDelete} title="Delete">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </ActionBtn>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={clsx(
                'absolute -top-12 z-30 flex gap-0.5 rounded-full bg-black/60 px-2 py-1 backdrop-blur',
                isOwn ? 'right-0' : 'left-0',
              )}
            >
              {REACTION_EMOJIS.map((e) => (
                <motion.button
                  key={e}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onReact(e);
                    setShowActions(false);
                  }}
                  className="text-base"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ActionBtn({
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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </motion.button>
  );
}
