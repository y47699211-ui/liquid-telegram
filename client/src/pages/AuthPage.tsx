import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useStore((s) => s.setAuth);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(username.trim(), password)
          : await api.register(username.trim(), password, displayName.trim() || username.trim());
      setAuth(result.token, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="glass relative w-full max-w-md rounded-[28px] p-8"
      >
        <div className="mb-7 flex flex-col items-center gap-3">
          <motion.div
            initial={{ rotate: -8, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180 }}
            className="relative flex h-16 w-16 items-center justify-center rounded-[18px]"
            style={{
              background:
                'linear-gradient(135deg,#7C5CFF 0%,#5B7BFF 45%,#22D3EE 100%)',
              boxShadow: '0 10px 40px rgba(124,92,255,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <svg viewBox="0 0 64 64" className="h-9 w-9 text-white" fill="currentColor">
              <path d="M14 32 L50 18 L44 48 L30 40 L24 46 L26 36 Z" opacity="0.95" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">Liquid Telegram</h1>
          <p className="text-sm text-white/60">
            {mode === 'login' ? 'Welcome back. Sign in to continue.' : 'Create a new account.'}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="alice"
            autoComplete="username"
          />
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <Field
                  label="Display name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Alice"
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || !username || !password}
            whileTap={{ scale: 0.98 }}
            className="relative mt-2 overflow-hidden rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition disabled:opacity-50"
            style={{
              background:
                'linear-gradient(135deg,#7C5CFF 0%,#5B7BFF 50%,#22D3EE 100%)',
            }}
          >
            <span className="relative z-10">
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </span>
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition group-hover:opacity-100" />
          </motion.button>
        </form>

        <div className="mt-5 text-center text-sm text-white/55">
          {mode === 'login' ? "Don't have an account?" : 'Already have one?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="font-semibold text-accent-light hover:text-white"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}

function Field({ label, value, onChange, placeholder, type = 'text', autoComplete }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-white/45">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        className="glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-accent/60"
      />
    </label>
  );
}
