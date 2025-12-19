import { create } from 'zustand';
import api from '../lib/api';

export interface ChatMessage {
  id: number;
  from_id: number;
  to_id: number;
  message: string;
  created_at: string;
}

export interface ReadReceipt {
  peerId: number;
  lastReadMsgId: number;
}

interface ChatState {
  conversations: Record<number, ChatMessage[]>;
  unreadCounts: Record<number, number>;
  readReceipts: Record<number, number>;
  activePeerId: number | null;
  setActivePeer: (peerId: number | null) => void;
  loadConversation: (userId: number, peerId: number) => Promise<void>;
  sendMessage: (userId: number, peerId: number, message: string) => Promise<void>;
  handleIncomingMessage: (userId: number, peerId: number) => Promise<void>;
  syncReadReceipts: (userId: number) => Promise<void>;
  markRead: (userId: number, peerId: number, lastReadMsgId: number) => Promise<void>;
}

const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  const map = new Map<number, ChatMessage>();
  existing.forEach((message) => map.set(message.id, message));
  incoming.forEach((message) => map.set(message.id, message));
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
};

const computeUnreadCount = (
  messages: ChatMessage[],
  peerId: number,
  lastReadMsgId?: number,
) => {
  if (!lastReadMsgId) {
    return messages.filter((message) => message.from_id === peerId).length;
  }

  return messages.filter(
    (message) => message.from_id === peerId && message.id > lastReadMsgId,
  ).length;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: {},
  unreadCounts: {},
  readReceipts: {},
  activePeerId: null,
  setActivePeer: (peerId) => {
    set({ activePeerId: peerId });
  },
  loadConversation: async (userId, peerId) => {
    const response = await api.get('/chat/retrieve', {
      params: { userId, toId: peerId },
    });
    const incoming = response.data as ChatMessage[];
    const existing = get().conversations[peerId] ?? [];
    const merged = mergeMessages(existing, incoming);
    const lastReadMsgId = get().readReceipts[peerId];
    const unread = computeUnreadCount(merged, peerId, lastReadMsgId);

    set((state) => ({
      conversations: { ...state.conversations, [peerId]: merged },
      unreadCounts: { ...state.unreadCounts, [peerId]: unread },
    }));
  },
  sendMessage: async (userId, peerId, message) => {
    await api.post('/chat/send', { fromId: userId, toId: peerId, message });
    await get().loadConversation(userId, peerId);
  },
  handleIncomingMessage: async (userId, peerId) => {
    await get().loadConversation(userId, peerId);
    const activePeerId = get().activePeerId;
    if (activePeerId === peerId) {
      const messages = get().conversations[peerId] ?? [];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        await get().markRead(userId, peerId, lastMessage.id);
      }
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [peerId]: 0 },
      }));
    }
  },
  syncReadReceipts: async (userId) => {
    const response = await api.get('/chat/sync_read_receipts', { params: { userId } });
    const receipts = response.data.receipts as ReadReceipt[];
    const nextReceipts: Record<number, number> = {};
    receipts.forEach((receipt) => {
      nextReceipts[receipt.peerId] = receipt.lastReadMsgId;
    });
    set({ readReceipts: nextReceipts });
  },
  markRead: async (userId, peerId, lastReadMsgId) => {
    await api.post('/chat/mark_read', { userId, peerId, lastReadMsgId });
    set((state) => ({
      readReceipts: { ...state.readReceipts, [peerId]: lastReadMsgId },
      unreadCounts: { ...state.unreadCounts, [peerId]: 0 },
    }));
  },
}));
