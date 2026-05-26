import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { UserAvatar } from './Avatar';
import type { StoryGroup } from '../types';
import { useStore } from '../store';

interface Props {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
}

const DURATION_MS = 5000;

export default function StoryViewer({ groups, startIndex, onClose }: Props) {
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const showProfileView = useStore((s) => s.showProfileView);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  useEffect(() => {
    setStoryIdx(0);
  }, [groupIdx]);

  useEffect(() => {
    if (!story) return;
    void api.viewStory(story.id);
    startedAt.current = Date.now();
    setProgress(0);
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      const next = Math.min(1, elapsed / DURATION_MS);
      setProgress(next);
      if (next >= 1) {
        advance();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const advance = () => {
    if (!group) return;
    if (storyIdx + 1 < group.stories.length) {
      setStoryIdx(storyIdx + 1);
      return;
    }
    if (groupIdx + 1 < groups.length) {
      setGroupIdx(groupIdx + 1);
      return;
    }
    onClose();
  };

  const back = () => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
      return;
    }
    if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1);
    }
  };

  if (!group || !story) return null;
  const bg = story.background || 'linear-gradient(135deg,#7C5CFF,#22D3EE)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6"
      style={{ background: 'rgba(4,3,12,0.85)', backdropFilter: 'blur(18px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] aspect-[9/16] rounded-[32px] overflow-hidden glass"
        style={{
          background: story.imageUrl ? `center / cover no-repeat url(${story.imageUrl}), ${bg}` : bg,
        }}
      >
        <div className="absolute inset-x-3 top-3 flex gap-1 z-10">
          {group.stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white/95 transition-[width] ease-linear"
                style={{
                  width: `${i < storyIdx ? 100 : i === storyIdx ? progress * 100 : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-4 right-4 flex items-center gap-2 z-10">
          <UserAvatar
            user={group.author}
            size={36}
            onClick={() => {
              onClose();
              showProfileView(group.author.id);
            }}
          />
          <div className="text-white text-sm font-medium drop-shadow">
            {group.author.displayName}
          </div>
          <div className="text-white/60 text-xs ml-auto">
            {Math.round((Date.now() - story.createdAt) / 60000)}m
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none ml-2"
          >
            ×
          </button>
        </div>

        {/* Click zones */}
        <button
          type="button"
          onClick={back}
          className="absolute inset-y-0 left-0 w-1/3 z-[5]"
          aria-label="previous"
        />
        <button
          type="button"
          onClick={advance}
          className="absolute inset-y-0 right-0 w-1/3 z-[5]"
          aria-label="next"
        />

        {story.body && (
          <div className="absolute bottom-10 left-6 right-6 text-center text-white text-xl font-semibold whitespace-pre-wrap z-10"
               style={{ textShadow: '0 2px 18px rgba(0,0,0,0.55)' }}>
            {story.body}
          </div>
        )}

        <div className="absolute bottom-3 left-6 right-6 text-center text-white/65 text-xs z-10">
          {story.views} {story.views === 1 ? 'view' : 'views'}
        </div>
      </motion.div>
    </motion.div>
  );
}
