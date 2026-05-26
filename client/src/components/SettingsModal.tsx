import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { api } from '../api';
import { disconnectSocket } from '../socket';
import AvatarPicker from './AvatarPicker';
import type { ProfileLink } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACCENT_PRESETS = [
  'linear-gradient(135deg,#7C5CFF,#22D3EE)',
  'linear-gradient(135deg,#F472B6,#7C5CFF)',
  'linear-gradient(135deg,#22D3EE,#34D399)',
  'linear-gradient(135deg,#FB923C,#F472B6)',
  'linear-gradient(135deg,#A78BFA,#22D3EE)',
  'linear-gradient(135deg,#F59E0B,#F472B6)',
];

const STATUS_EMOJI = ['😎', '🌙', '🚀', '✨', '🎧', '☕', '💼', '🔥', '🎨', '⚡', '🌊', ''];

export default function SettingsModal({ open, onClose }: Props) {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const logout = useStore((s) => s.logout);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji ?? '');
  const [statusText, setStatusText] = useState(user?.statusText ?? '');
  const [accent, setAccent] = useState(user?.accentColor || ACCENT_PRESETS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [links, setLinks] = useState<ProfileLink[]>(user?.links ?? []);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setDisplayName(user.displayName);
    setBio(user.bio);
    setStatusEmoji(user.statusEmoji);
    setStatusText(user.statusText);
    setAccent(user.accentColor || ACCENT_PRESETS[0]);
    setAvatarUrl(user.avatarUrl);
    setLinks(user.links);
  }, [open, user]);

  const save = async () => {
    setSaving(true);
    try {
      const { user: updated } = await api.updateMe({
        displayName: displayName.trim() || undefined,
        bio,
        statusEmoji,
        statusText,
        accentColor: accent,
        avatarUrl,
        links,
      });
      updateUser(updated);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,6,24,0.5)', backdropFilter: 'blur(14px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 250 }}
            className="glass relative w-full max-w-md rounded-[28px] p-6 max-h-[90vh] overflow-y-auto scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex flex-col items-center gap-3">
              <AvatarPicker
                name={displayName || user.displayName}
                color={accent}
                url={avatarUrl}
                size={90}
                onChange={setAvatarUrl}
              />
              <div className="text-center">
                <div className="text-lg font-semibold">{displayName || user.displayName}</div>
                <div className="text-sm text-white/55">@{user.username}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Display name
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="glass-soft rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-white/15"
                />
              </label>

              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Mood
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_EMOJI.map((e) => (
                    <button
                      type="button"
                      key={e || 'none'}
                      onClick={() => setStatusEmoji(e)}
                      className={`h-9 w-9 rounded-xl glass-soft text-lg transition ${
                        statusEmoji === e ? 'ring-2 ring-white/40 scale-105' : ''
                      }`}
                    >
                      {e || '—'}
                    </button>
                  ))}
                </div>
                <input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  maxLength={60}
                  placeholder="What's going on?"
                  className="w-full glass-soft rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-white/15"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Accent
                </div>
                <div className="flex gap-1.5">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setAccent(preset)}
                      className={`h-8 w-8 rounded-xl transition ${
                        accent === preset ? 'ring-2 ring-white/60 scale-110' : 'opacity-80'
                      }`}
                      style={{ background: preset }}
                    />
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Bio
                </span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={280}
                  className="glass-soft resize-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-white/15"
                />
              </label>

              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-white/45">
                  Links
                </div>
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="glass-soft rounded-xl px-3 py-1.5 flex-1 truncate">
                      <span className="font-medium">{l.label}</span>{' '}
                      <span className="text-white/45 text-xs">{l.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinks(links.filter((_, j) => j !== i))}
                      className="text-rose-300 hover:text-rose-200 text-sm px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {links.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Label"
                      maxLength={24}
                      className="glass-soft rounded-xl px-3 py-1.5 text-sm flex-1 outline-none"
                    />
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://…"
                      maxLength={200}
                      className="glass-soft rounded-xl px-3 py-1.5 text-sm flex-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!linkLabel.trim() || !linkUrl.trim()) return;
                        setLinks([...links, { label: linkLabel.trim(), url: linkUrl.trim() }]);
                        setLinkLabel('');
                        setLinkUrl('');
                      }}
                      className="text-sm text-white px-3 rounded-xl"
                      style={{ background: accent }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => {
                  disconnectSocket();
                  logout();
                  onClose();
                }}
                className="rounded-2xl px-4 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/20"
              >
                Log out
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-2xl px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={saving}
                  onClick={save}
                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                  style={{ background: accent }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
