import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import Avatar from './Avatar';

interface Props {
  name: string;
  color: string;
  url: string | null;
  size?: number;
  onChange: (url: string | null) => void;
}

export default function AvatarPicker({ name, color, url, size = 96, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { url: newUrl } = await api.uploadImage(file);
      onChange(newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="relative rounded-full focus:outline-none"
      >
        <Avatar name={name} color={color} url={url} size={size} />
        <span
          className="absolute inset-0 rounded-full flex items-end justify-center text-[11px] font-semibold uppercase tracking-wide opacity-0 hover:opacity-100 transition-opacity"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)',
            color: 'white',
            paddingBottom: 8,
          }}
        >
          {uploading ? 'uploading…' : 'change'}
        </span>
      </motion.button>
      <div className="flex gap-2">
        <button
          type="button"
          className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-white"
          onClick={() => inputRef.current?.click()}
        >
          upload
        </button>
        {url && (
          <button
            type="button"
            className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-white"
            onClick={() => onChange(null)}
          >
            remove
          </button>
        )}
      </div>
      {error && <div className="text-[11px] text-rose-300">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
