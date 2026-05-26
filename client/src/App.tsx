import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import Background from './components/Background';
import { api } from './api';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = useStore((s) => s.token);
  const setAuth = useStore((s) => s.setAuth);
  const logout = useStore((s) => s.logout);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .me()
      .then(({ user: u }) => {
        if (user) setAuth(token, { ...user, ...u });
      })
      .catch(() => {
        logout();
        navigate('/login', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Background />
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRoute>
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 h-full"
                >
                  <AuthPage />
                </motion.div>
              </AuthRoute>
            }
          />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <motion.div
                  key="app"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 h-full"
                >
                  <ChatPage />
                </motion.div>
              </RequireAuth>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
