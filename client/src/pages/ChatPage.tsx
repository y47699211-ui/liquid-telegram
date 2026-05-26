import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { api } from '../api';
import { connectSocket, disconnectSocket } from '../socket';
import Sidebar from '../components/Sidebar';
import Conversation from '../components/Conversation';
import SettingsModal from '../components/SettingsModal';
import NewChatModal from '../components/NewChatModal';
import FeedPage from '../components/FeedPage';
import ProfileModal from '../components/ProfileModal';
import NotificationsPanel from '../components/NotificationsPanel';
import ProfileSetup from '../components/ProfileSetup';
import type { ChatPreview, Message, AppNotification } from '../types';

export default function ChatPage() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const view = useStore((s) => s.view);
  const setChats = useStore((s) => s.setChats);
  const upsertChat = useStore((s) => s.upsertChat);
  const appendMessage = useStore((s) => s.appendMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const setOnline = useStore((s) => s.setOnline);
  const setTyping = useStore((s) => s.setTyping);
  const pruneTyping = useStore((s) => s.pruneTyping);
  const setNotifications = useStore((s) => s.setNotifications);
  const pushNotification = useStore((s) => s.pushNotification);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listChats().then(({ chats }) => setChats(chats)).catch(console.error);
    api
      .notifications()
      .then(({ notifications, unread }) => setNotifications(notifications, unread))
      .catch(() => undefined);

    const socket = connectSocket(token);

    socket.on('connect', () => {
      api.listChats().then(({ chats }) => setChats(chats)).catch(() => {});
    });

    socket.on('chat:updated', (chat: ChatPreview) => {
      upsertChat(chat);
    });

    socket.on('message:new', (msg: Message) => {
      appendMessage(msg.chatId, msg);
      const activeId = useStore.getState().activeChatId;
      if (activeId === msg.chatId) {
        socket.emit('chat:read', msg.chatId);
      }
    });

    socket.on('message:edited', (data: { id: string; chatId: string; body: string; editedAt: number }) => {
      updateMessage(data.chatId, data.id, { body: data.body, editedAt: data.editedAt });
    });

    socket.on('message:deleted', (data: { id: string; chatId: string }) => {
      updateMessage(data.chatId, data.id, { deletedAt: Date.now(), body: '' });
    });

    socket.on('message:pinned', (data: { id: string; chatId: string; pinned: boolean }) => {
      updateMessage(data.chatId, data.id, { pinned: data.pinned });
      api.listChats().then(({ chats }) => setChats(chats)).catch(() => undefined);
    });

    socket.on(
      'reaction:updated',
      (data: { id: string; chatId: string; reactions: { userId: string; emoji: string }[] }) => {
        updateMessage(data.chatId, data.id, { reactions: data.reactions });
      },
    );

    socket.on('presence', (data: { userId: string; online: boolean }) => {
      setOnline(data.userId, data.online);
    });

    socket.on(
      'typing',
      (data: { chatId: string; userId: string; displayName: string; typing: boolean }) => {
        setTyping(data.chatId, data.userId, data.displayName, data.typing);
      },
    );

    socket.on('notification:new', (n: AppNotification) => {
      pushNotification(n);
    });

    socket.on('story:new', () => {
      api
        .storyFeed()
        .then(({ groups }) => useStore.getState().setStoryGroups(groups))
        .catch(() => undefined);
    });

    const pruneInterval = window.setInterval(() => pruneTyping(), 2000);

    return () => {
      window.clearInterval(pruneInterval);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (user && !user.onboarded) {
    return <ProfileSetup />;
  }

  return (
    <div className="flex h-full">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewChat={() => setNewChatOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
      <AnimatePresence mode="wait">
        {view === 'chats' ? (
          <motion.div
            key="chats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex min-w-0"
          >
            <Conversation />
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex min-w-0"
          >
            <FeedPage />
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      <ProfileModal />
    </div>
  );
}
