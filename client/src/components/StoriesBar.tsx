import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { useStore } from '../store';
import { UserAvatar } from './Avatar';
import StoryComposer from './StoryComposer';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const groups = useStore((s) => s.storyGroups);
  const setGroups = useStore((s) => s.setStoryGroups);
  const me = useStore((s) => s.user);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    api
      .storyFeed()
      .then(({ groups }) => setGroups(groups))
      .catch(() => undefined);
  }, [setGroups]);

  const myGroup = me ? groups.find((g) => g.authorId === me.id) : null;
  const otherGroups = me ? groups.filter((g) => g.authorId !== me.id) : groups;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scroll-thin pb-2 px-1 pt-1">
        {me && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => (myGroup ? setViewerIndex(0) : setComposerOpen(true))}
            className="flex flex-col items-center gap-1 min-w-[64px]"
          >
            <div className="relative">
              <UserAvatar
                user={me}
                size={56}
                ring={myGroup ? (myGroup.allViewed ? 'story-viewed' : 'story-unviewed') : 'none'}
              />
              {!myGroup && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#7C5CFF,#22D3EE)' }}
                >
                  +
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[64px]">
              {myGroup ? 'Your story' : 'Add story'}
            </span>
          </motion.button>
        )}
        {otherGroups.map((g, idx) => {
          const realIdx = me && myGroup ? idx + 1 : idx;
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={g.authorId}
              type="button"
              onClick={() => setViewerIndex(realIdx)}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <UserAvatar
                user={g.author}
                size={56}
                ring={g.allViewed ? 'story-viewed' : 'story-unviewed'}
              />
              <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[64px]">
                {g.author.displayName.split(' ')[0]}
              </span>
            </motion.button>
          );
        })}
        {groups.length === 0 && (
          <div className="text-xs text-[var(--text-muted)] py-3 px-2">
            No stories yet — share what's on your mind.
          </div>
        )}
      </div>
      <AnimatePresence>
        {composerOpen && (
          <StoryComposer
            onClose={() => setComposerOpen(false)}
            onCreated={async () => {
              setComposerOpen(false);
              const { groups: fresh } = await api.storyFeed();
              setGroups(fresh);
            }}
          />
        )}
        {viewerIndex !== null && (
          <StoryViewer
            groups={
              me && myGroup ? [myGroup, ...otherGroups] : me ? otherGroups : groups
            }
            startIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
