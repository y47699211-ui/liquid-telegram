import type React from 'react';
import clsx from 'clsx';
import { initials } from '../utils';
import type { User } from '../types';

interface Props {
  name: string;
  color: string;
  url?: string | null;
  size?: number;
  online?: boolean;
  ring?: 'none' | 'story-unviewed' | 'story-viewed';
  className?: string;
  onClick?: () => void;
}

export default function Avatar({
  name,
  color,
  url,
  size = 44,
  online,
  ring = 'none',
  className,
  onClick,
}: Props) {
  const fontSize = Math.max(11, Math.floor(size * 0.38));
  const ringStyle =
    ring === 'story-unviewed'
      ? {
          padding: 2,
          background:
            'conic-gradient(from 220deg, #7C5CFF, #22D3EE, #F472B6, #7C5CFF)',
        }
      : ring === 'story-viewed'
        ? { padding: 2, background: 'rgba(255,255,255,0.18)' }
        : { padding: 0, background: 'transparent' };
  const inner = (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: url
          ? `center / cover no-repeat url(${url})`
          : color || 'linear-gradient(135deg,#7C5CFF,#22D3EE)',
        fontSize,
      }}
    >
      {!url && initials(name || '?')}
    </span>
  );
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };
  return (
    <span
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        'relative inline-block rounded-full',
        onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40' : 'cursor-default',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="block rounded-full transition-shadow"
        style={{ width: size, height: size, ...ringStyle }}
      >
        {inner}
      </span>
      {online !== undefined && (
        <span
          className={clsx(
            'absolute right-0 bottom-0 rounded-full ring-2',
            online ? 'bg-emerald-400 ring-[#0b0820]' : 'bg-slate-500/60 ring-[#0b0820]',
          )}
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
        />
      )}
    </span>
  );
}

export function UserAvatar({
  user,
  size = 44,
  online,
  ring = 'none',
  onClick,
  className,
}: {
  user: Pick<User, 'displayName' | 'avatarColor' | 'avatarUrl'>;
  size?: number;
  online?: boolean;
  ring?: 'none' | 'story-unviewed' | 'story-viewed';
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Avatar
      name={user.displayName}
      color={user.avatarColor}
      url={user.avatarUrl}
      size={size}
      online={online}
      ring={ring}
      onClick={onClick}
      className={className}
    />
  );
}
