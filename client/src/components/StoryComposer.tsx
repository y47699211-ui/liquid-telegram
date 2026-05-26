import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

const BACKGROUNDS = [
  'linear-gradient(135deg,#7C5CFF,#22D3EE)',
  'linear-gradient(135deg,#F472B6,#7C5CFF)',
  'linear-gradient(135deg,#22D3EE,#34D399)',
  'linear-gradient(135deg,#FB923C,#F472B6)',
  'linear-gradient(135deg,#0EA5E9,#A78BFA)',
  'linear-gradient(160deg,#0F172A,#312E81)',
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function StoryComposer({ onClose, onCreated }: Props) {
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!body.trim() && !imageUrl) return;
    setSubmitting(true);
    try {
      await api.createStory(body.trim(), imageUrl, bg);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,6,24,0.65)', backdropFilter: 'blur(18px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-[28px] p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New story</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div
          className="relative h-72 rounded-3xl overflow-hidden flex items-center justify-center text-center px-6"
          style={{
            background: imageUrl
              ? `center / cover no-repeat url(${imageUrl}), ${bg}`
              : bg,
          }}
        >
          <span
            className="text-white text-xl font-semibold drop-shadow-lg whitespace-pre-wrap"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}
          >
            {body || 'Tap to write…'}
          </span>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={240}
          placeholder="Say something…"
          rows={2}
          className="w-full glass-soft rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-white/20 resize-none"
        />

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            background
          </div>
          <div className="flex gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBg(b)}
                className={`h-9 w-9 rounded-2xl transition-all ${
                  bg === b ? 'ring-2 ring-white/60 scale-110' : 'opacity-85'
                }`}
                style={{ background: b }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-sm text-[var(--text-secondary)] hover:text-white"
          >
            {uploading ? 'uploading…' : imageUrl ? 'change image' : 'attach image'}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="text-sm text-rose-300 hover:text-rose-200"
            >
              remove
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting || (!body.trim() && !imageUrl)}
          className="w-full h-11 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: bg }}
        >
          {submitting ? 'Sharing…' : 'Share to followers'}
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
