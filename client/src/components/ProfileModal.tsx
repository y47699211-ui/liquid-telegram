import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, type ProfileView } from '../api';
import { useStore } from '../store';
import { UserAvatar } from './Avatar';
import type { Post } from '../types';

export default function ProfileModal() {
  const profileViewUserId = useStore((s) => s.profileViewUserId);
  const showProfileView = useStore((s) => s.showProfileView);
  const me = useStore((s) => s.user);
  const chats = useStore((s) => s.chats);
  const upsertChat = useStore((s) => s.upsertChat);
  const setActiveChat = useStore((s) => s.setActiveChat);
  const [data, setData] = useState<ProfileView | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profileViewUserId) {
      setData(null);
      setPosts([]);
      return;
    }
    setLoading(true);
    Promise.all([api.getUser(profileViewUserId), api.userPosts(profileViewUserId)])
      .then(([d, p]) => {
        setData(d);
        setPosts(p.posts);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [profileViewUserId]);

  const toggleFollow = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      if (data.isFollowing) {
        await api.unfollow(data.user.id);
        setData({ ...data, isFollowing: false, followers: Math.max(0, data.followers - 1) });
      } else {
        await api.follow(data.user.id);
        setData({ ...data, isFollowing: true, followers: data.followers + 1 });
      }
    } finally {
      setBusy(false);
    }
  };

  const openDirect = async () => {
    if (!data) return;
    const existing = chats.find(
      (c) => c.type === 'direct' && c.members.some((m) => m.id === data.user.id),
    );
    if (existing) {
      setActiveChat(existing.id);
      showProfileView(null);
      return;
    }
    const { chat } = await api.createDirect(data.user.id);
    upsertChat(chat);
    setActiveChat(chat.id);
    showProfileView(null);
  };

  return (
    <AnimatePresence>
      {profileViewUserId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,6,24,0.55)', backdropFilter: 'blur(14px)' }}
          onClick={() => showProfileView(null)}
        >
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-[28px] p-7 w-full max-w-lg space-y-5 max-h-[88vh] overflow-y-auto scroll-thin"
          >
            {loading || !data ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">Loading…</div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <UserAvatar user={data.user} size={108} />
                  <div className="space-y-0.5">
                    <div className="text-xl font-semibold flex items-center gap-2 justify-center">
                      {data.user.statusEmoji && <span>{data.user.statusEmoji}</span>}
                      {data.user.displayName}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">@{data.user.username}</div>
                  </div>
                  {data.user.statusText && (
                    <div className="text-sm text-[var(--text-secondary)] italic">
                      {data.user.statusText}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-10 text-center">
                  <div>
                    <div className="text-lg font-semibold">{posts.length}</div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      posts
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{data.followers}</div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      followers
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{data.following}</div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      following
                    </div>
                  </div>
                </div>

                {data.user.bio && (
                  <p className="text-sm text-[var(--text-secondary)] text-center px-4">
                    {data.user.bio}
                  </p>
                )}

                {data.user.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.user.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-2xl glass-soft text-xs hover:bg-white/10"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}

                {me && me.id !== data.user.id && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={busy}
                      className={`flex-1 h-11 rounded-2xl text-sm font-semibold transition disabled:opacity-50 ${
                        data.isFollowing
                          ? 'glass-soft text-[var(--text-secondary)] hover:text-white'
                          : 'text-white'
                      }`}
                      style={
                        data.isFollowing
                          ? undefined
                          : { background: data.user.accentColor || 'linear-gradient(135deg,#7C5CFF,#22D3EE)' }
                      }
                    >
                      {data.isFollowing ? 'Following' : data.followsYou ? 'Follow back' : 'Follow'}
                    </button>
                    <button
                      type="button"
                      onClick={openDirect}
                      className="flex-1 h-11 rounded-2xl glass-soft text-sm font-medium hover:bg-white/10"
                    >
                      Message
                    </button>
                  </div>
                )}

                {posts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] px-1">
                      latest posts
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {posts.slice(0, 5).map((p) => (
                        <div key={p.id} className="glass-soft rounded-2xl p-3 text-sm">
                          <div className="whitespace-pre-wrap">{p.body}</div>
                          {p.imageUrl && (
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="mt-2 rounded-xl max-h-44 w-full object-cover"
                            />
                          )}
                          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex gap-3">
                            <span>♥ {p.likeCount}</span>
                            <span>💬 {p.commentCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
