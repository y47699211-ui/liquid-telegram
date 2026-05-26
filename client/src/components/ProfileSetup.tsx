import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useStore } from '../store';
import AvatarPicker from './AvatarPicker';

const ACCENT_PRESETS = [
  'linear-gradient(135deg,#7C5CFF,#22D3EE)',
  'linear-gradient(135deg,#F472B6,#7C5CFF)',
  'linear-gradient(135deg,#22D3EE,#34D399)',
  'linear-gradient(135deg,#FB923C,#F472B6)',
  'linear-gradient(135deg,#A78BFA,#22D3EE)',
  'linear-gradient(135deg,#F59E0B,#F472B6)',
];

const STATUS_EMOJI = ['😎', '🌙', '🚀', '✨', '🎧', '☕', '💼', '🔥', '🎨', '⚡', '🌊'];

export default function ProfileSetup() {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji ?? '✨');
  const [statusText, setStatusText] = useState(user?.statusText ?? '');
  const [accent, setAccent] = useState(user?.accentColor || ACCENT_PRESETS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await api.updateMe({
        bio,
        statusEmoji,
        statusText,
        accentColor: accent,
        avatarUrl,
        onboarded: true,
      });
      updateUser(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      const { user: updated } = await api.updateMe({ onboarded: true });
      updateUser(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass rounded-[28px] p-7 w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-1">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            welcome to aurora
          </div>
          <h1 className="text-2xl font-semibold">Build your profile</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            A few details so others recognise you.
          </p>
        </div>

        <div className="flex justify-center">
          <AvatarPicker
            name={user.displayName}
            color={accent}
            url={avatarUrl}
            size={110}
            onChange={setAvatarUrl}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            mood
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_EMOJI.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setStatusEmoji(e)}
                className={`h-10 w-10 rounded-2xl glass-soft text-xl transition-all ${
                  statusEmoji === e ? 'ring-2 ring-white/40 scale-105' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            maxLength={60}
            placeholder="What's going on?"
            className="w-full glass-soft rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-white/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            accent
          </label>
          <div className="flex gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setAccent(preset)}
                className={`h-9 w-9 rounded-2xl transition-all ${
                  accent === preset ? 'ring-2 ring-white/60 scale-110' : 'opacity-80'
                }`}
                style={{ background: preset }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            about
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            placeholder="Designer, dreamer, late-night coder…"
            className="w-full glass-soft rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-white/20 resize-none"
            rows={3}
          />
          <div className="text-right text-[11px] text-[var(--text-muted)]">{bio.length}/280</div>
        </div>

        {error && <div className="text-sm text-rose-300 text-center">{error}</div>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="flex-1 h-11 rounded-2xl glass-soft text-sm text-[var(--text-secondary)] hover:text-white disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex-1 h-11 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: accent }}
          >
            {saving ? 'Saving…' : 'Enter Aurora'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
