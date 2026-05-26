import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { connectSocket, disconnectSocket } from '../socket';
import Sidebar from '../components/Sidebar';
import Conversation from '../components/Conversation';
import SettingsModal from '../components/SettingsModal';
import NewChatModal from '../components/NewChatModal';
import type { ChatPreview, Message } from '../types';

export default function ChatPage() {
  const token = useStore((s) => s.token);
  const setChats = useStore((s) => s.setChats);
  const upsertChat = useStore((s) => s.upsertChat);
  const appendMessage = useStore((s) => s.appendMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const setOnline = useStore((s) => s.setOnline);
  const setTyping = useStore((s) => s.setTyping);
  const pruneTyping = useStore((s) => s.pruneTyping);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listChats().then(({ chats }) => setChats(chats)).catch(console.error);

    const socket = connectSocket(token);

    socket.on('connect', () => {
      // Refresh chats on reconnect
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

    const pruneInterval = window.setInterval(() => pruneTyping(), 2000);

    return () => {
      window.clearInterval(pruneInterval);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex h-full">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewChat={() => setNewChatOpen(true)}
      />
      <Conversation />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </div>
  );
}
