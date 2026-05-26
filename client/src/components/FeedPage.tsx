import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { useStore } from '../store';
import { UserAvatar } from './Avatar';
import StoriesBar from './StoriesBar';
import { formatRelative } from '../utils';
import type { Post, PostComment } from '../types';

export default function FeedPage() {
  const posts = useStore((s) => s.feedPosts);
  const setFeedPosts = useStore((s) => s.setFeedPosts);
  const upsertPost = useStore((s) => s.upsertPost);
  const removePost = useStore((s) => s.removePost);
  const me = useStore((s) => s.user);
  const showProfileView = useStore((s) => s.showProfileView);
  const [mode, setMode] = useState<'feed' | 'discover'>('feed');
  const [composerOpen, setComposerOpen] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);

  useEffect(() => {
    const load = mode === 'feed' ? api.feed() : api.discover();
    load.then(({ posts }) => setFeedPosts(posts)).catch(() => undefined);
  }, [mode, setFeedPosts]);

  const toggleLike = async (post: Post) => {
    const optimistic: Post = {
      ...post,
      liked: !post.liked,
      likeCount: post.likeCount + (post.liked ? -1 : 1),
    };
    upsertPost(optimistic);
    try {
      const { post: updated } = await api.togglePostLike(post.id);
      upsertPost(updated);
    } catch {
      upsertPost(post);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
      <div className="p-5 pb-3 space-y-4 border-b border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              aurora
            </div>
            <h1 className="text-2xl font-semibold">Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass-soft rounded-2xl p-1 flex">
              {(['feed', 'discover'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition ${
                    mode === m ? 'bg-white/15 text-white' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="h-10 px-4 rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7C5CFF,#22D3EE)' }}
            >
              + Post
            </button>
          </div>
        </div>
        <StoriesBar />
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 sm:px-6 py-5 space-y-4">
        {posts.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)] text-sm">
            {mode === 'feed' ? 'Follow people to see their posts here.' : 'No posts yet.'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="glass rounded-3xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={post.author}
                  size={42}
                  onClick={() => showProfileView(post.author.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="font-medium text-sm truncate hover:underline"
                      onClick={() => showProfileView(post.author.id)}
                    >
                      {post.author.displayName}
                    </button>
                    {post.author.statusEmoji && (
                      <span className="text-sm">{post.author.statusEmoji}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    @{post.author.username} · {formatRelative(post.createdAt)}
                  </div>
                </div>
                {me?.id === post.author.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Delete this post?')) return;
                      await api.deletePost(post.id);
                      removePost(post.id);
                    }}
                    className="text-[var(--text-muted)] hover:text-rose-300 text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
              {post.body && (
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {post.body}
                </div>
              )}
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt=""
                  className="rounded-2xl w-full max-h-[480px] object-cover"
                />
              )}
              <div className="flex items-center gap-1 text-sm pt-1">
                <button
                  type="button"
                  onClick={() => toggleLike(post)}
                  className={`px-3 py-1.5 rounded-2xl glass-soft flex items-center gap-1.5 transition hover:bg-white/10 ${
                    post.liked ? 'text-rose-300' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={post.liked ? 'scale-110' : ''}>{post.liked ? '♥' : '♡'}</span>
                  <span className="text-xs">{post.likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                  className="px-3 py-1.5 rounded-2xl glass-soft text-[var(--text-secondary)] hover:bg-white/10 flex items-center gap-1.5"
                >
                  💬 <span className="text-xs">{post.commentCount}</span>
                </button>
              </div>
              {openComments === post.id && <CommentsThread postId={post.id} onAdded={() => upsertPost({ ...post, commentCount: post.commentCount + 1 })} />}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {composerOpen && (
          <PostComposer
            onClose={() => setComposerOpen(false)}
            onCreated={(p) => {
              setComposerOpen(false);
              upsertPost(p);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentsThread({ postId, onAdded }: { postId: string; onAdded: () => void }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showProfileView = useStore((s) => s.showProfileView);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    api.loadComments(postId).then(({ comments }) => setComments(comments));
  }, [postId]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { comment } = await api.addComment(postId, trimmed);
      setComments((cur) => [...cur, comment]);
      setBody('');
      onAdded();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 pt-2 border-t border-white/5"
    >
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2 items-start">
          <UserAvatar
            user={c.author}
            size={28}
            onClick={() => showProfileView(c.author.id)}
          />
          <div className="glass-soft rounded-2xl px-3 py-2 text-sm flex-1">
            <div className="text-[11px] text-[var(--text-muted)]">
              {c.author.displayName} · {formatRelative(c.createdAt)}
            </div>
            <div className="whitespace-pre-wrap break-words">{c.body}</div>
          </div>
        </div>
      ))}
      <div className="flex gap-2 items-center pt-1">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Reply…"
          maxLength={500}
          className="flex-1 glass-soft rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 ring-white/20"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || submitting}
          className="px-3 py-2 text-sm rounded-2xl text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7C5CFF,#22D3EE)' }}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}

function PostComposer({ onClose, onCreated }: { onClose: () => void; onCreated: (post: Post) => void }) {
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!body.trim() && !imageUrl) return;
    setSubmitting(true);
    try {
      const { post } = await api.createPost(body.trim(), imageUrl);
      onCreated(post);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,6,24,0.6)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-[28px] p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New post</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="What's happening?"
          rows={5}
          className="w-full glass-soft rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-white/20 resize-none"
        />
        {imageUrl && (
          <div className="relative">
            <img src={imageUrl} alt="" className="rounded-2xl w-full max-h-72 object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 glass rounded-full h-7 w-7 text-sm"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-sm text-[var(--text-secondary)] hover:text-white"
          >
            {uploading ? 'uploading…' : '📷 attach image'}
          </button>
          <div className="text-[11px] text-[var(--text-muted)]">{body.length}/2000</div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || (!body.trim() && !imageUrl)}
          className="w-full h-11 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7C5CFF,#22D3EE)' }}
        >
          {submitting ? 'Posting…' : 'Share'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </motion.div>
    </motion.div>
  );
}
