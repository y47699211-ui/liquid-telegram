import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import { useStore } from '../store';
import { UserAvatar } from './Avatar';
import { formatRelative } from '../utils';

const ICONS: Record<string, string> = {
  like: '♥',
  comment: '💬',
  follow: '+',
  mention: '@',
};

export default function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const notifications = useStore((s) => s.notifications);
  const setNotifications = useStore((s) => s.setNotifications);
  const clearUnreadNotifications = useStore((s) => s.clearUnreadNotifications);
  const showProfileView = useStore((s) => s.showProfileView);

  useEffect(() => {
    if (!open) return;
    api.notifications().then(({ notifications, unread }) => {
      setNotifications(notifications, unread);
      void api.markNotificationsRead();
      clearUnreadNotifications();
    });
  }, [open, setNotifications, clearUnreadNotifications]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-start justify-end p-4"
          style={{ background: 'rgba(8,6,24,0.45)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-[28px] p-5 w-full max-w-sm h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Activity</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin space-y-2 pr-1">
              {notifications.length === 0 && (
                <div className="text-center text-sm text-[var(--text-muted)] py-12">
                  Nothing here yet — your activity will appear here.
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition ${
                    n.read ? 'glass-soft' : 'bg-white/10'
                  }`}
                >
                  {n.actor ? (
                    <UserAvatar
                      user={n.actor}
                      size={36}
                      onClick={() => n.actor && showProfileView(n.actor.id)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full glass-soft flex items-center justify-center text-lg">
                      {ICONS[n.type] ?? '✨'}
                    </div>
                  )}
                  <div className="flex-1 text-sm leading-snug">
                    <div>
                      {n.actor && (
                        <button
                          type="button"
                          onClick={() => showProfileView(n.actor!.id)}
                          className="font-medium hover:underline"
                        >
                          {n.actor.displayName}
                        </button>
                      )}{' '}
                      <span className="text-[var(--text-secondary)]">{n.body}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">
                      {formatRelative(n.createdAt)}
                    </div>
                  </div>
                  <span className="text-lg leading-none text-[var(--text-muted)]">
                    {ICONS[n.type] ?? '✨'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
