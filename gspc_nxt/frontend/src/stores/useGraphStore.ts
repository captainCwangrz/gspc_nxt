import { create } from 'zustand';
import api from '../lib/api';

export interface GraphNode {
  id: number;
  name: string;
  username: string;
  avatar: string;
  signature: string;
  val: number;
  last_msg_id: number;
}

export interface GraphLink {
  source: number;
  target: number;
  type: string;
  last_msg_id: number;
  deleted: boolean;
}

export interface PendingRequest {
  id: number;
  from_id: number;
  type: string;
  username: string;
}

interface GraphState {
  nodes: GraphNode[];
  links: GraphLink[];
  requests: PendingRequest[];
  lastUpdate: string | null;
  refreshGraph: (userId: number) => Promise<void>;
  applyGraphUpdate: (payload: { userId: number }) => Promise<void>;
  acceptRequest: (userId: number, requestId: number) => Promise<void>;
  rejectRequest: (userId: number, requestId: number) => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  links: [],
  requests: [],
  lastUpdate: null,
  refreshGraph: async (userId) => {
    const response = await api.get('/graph', {
      params: { userId, lastUpdate: get().lastUpdate ?? undefined },
    });
    const { nodes, links, requests, lastUpdate } = response.data;
    set({ nodes, links, requests, lastUpdate });
  },
  applyGraphUpdate: async ({ userId }) => {
    await get().refreshGraph(userId);
  },
  acceptRequest: async (userId, requestId) => {
    await api.post('/relationships/accept', { userId, requestId });
    set((state) => ({
      requests: state.requests.filter((request) => request.id !== requestId),
    }));
    await get().refreshGraph(userId);
  },
  rejectRequest: async (userId, requestId) => {
    await api.post('/relationships/reject', { userId, requestId });
    set((state) => ({
      requests: state.requests.filter((request) => request.id !== requestId),
    }));
  },
}));
