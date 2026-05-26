import { initials } from '../utils';
import clsx from 'clsx';

interface Props {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
  className?: string;
}

export default function Avatar({ name, color, size = 44, online, className }: Props) {
  const fontSize = Math.max(11, Math.floor(size * 0.38));
  return (
    <div className={clsx('relative', className)} style={{ width: size, height: size }}>
      <div
        className="avatar"
        style={{
          width: size,
          height: size,
          background: color || 'linear-gradient(135deg,#7C5CFF,#22D3EE)',
          fontSize,
        }}
      >
        {initials(name || '?')}
      </div>
      {online !== undefined && (
        <span
          className={clsx(
            'absolute right-0 bottom-0 rounded-full ring-2',
            online ? 'bg-emerald-400 ring-[#0b0820]' : 'bg-slate-500/60 ring-[#0b0820]',
          )}
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
        />
      )}
    </div>
  );
}
