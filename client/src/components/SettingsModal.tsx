import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { api } from '../api';
import { disconnectSocket } from '../socket';
import Avatar from './Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const logout = useStore((s) => s.logout);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMe({ displayName: displayName.trim() || undefined, bio });
      updateUser({ displayName: displayName.trim() || user?.displayName, bio });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
            className="glass relative w-full max-w-md rounded-[28px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex flex-col items-center gap-3">
              <Avatar name={user?.displayName ?? '?'} color={user?.avatarColor ?? ''} size={84} />
              <div className="text-center">
                <div className="text-lg font-semibold">{user?.displayName}</div>
                <div className="text-sm text-white/55">@{user?.username}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/45">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="glass-soft rounded-xl px-4 py-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/45">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="glass-soft resize-none rounded-xl px-4 py-2.5 text-sm"
                />
              </label>
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
                <button onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10">
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={saving}
                  onClick={save}
                  className="rounded-2xl bg-gradient-to-br from-accent to-accent-glow px-5 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
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
