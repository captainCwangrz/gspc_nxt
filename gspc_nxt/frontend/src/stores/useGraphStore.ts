import { create } from 'zustand';
import api from '../lib/api';
import { resolveAssetUrl } from '../lib/assets';

export interface GraphNode {
  id: number;
  name: string;
  username: string;
  avatar: string;
  signature: string;
  val: number;
  last_msg_id: number;
  x?: number;
  y?: number;
  z?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface GraphLink {
  source: number | { id: number };
  target: number | { id: number };
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
  requestRelationship: (userId: number, toId: number, type: string) => Promise<void>;
  updateRelationship: (userId: number, toId: number, type: string) => Promise<void>;
  removeRelationship: (userId: number, toId: number) => Promise<void>;
  updateSignature: (userId: number, signature: string) => Promise<string | null>;
  updateNodePosition: (nodeId: number, position: { x: number; y: number; z: number }) => void;
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
    const existingNodes = get().nodes;
    const normalizedNodes = (nodes as GraphNode[]).map((node) => {
      const existing = existingNodes.find((item) => item.id === node.id);
      return {
        ...node,
        avatar: resolveAssetUrl(node.avatar),
        x: existing?.x ?? node.x,
        y: existing?.y ?? node.y,
        z: existing?.z ?? node.z,
        fx: existing?.fx ?? node.fx ?? null,
        fy: existing?.fy ?? node.fy ?? null,
        fz: existing?.fz ?? node.fz ?? null,
      };
    });
    set({ nodes: normalizedNodes, links, requests, lastUpdate });
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
  requestRelationship: async (userId, toId, type) => {
    await api.post('/relationships/request', { userId, toId, type });
    await get().refreshGraph(userId);
  },
  updateRelationship: async (userId, toId, type) => {
    await api.post('/relationships/update', { userId, toId, type });
    await get().refreshGraph(userId);
  },
  removeRelationship: async (userId, toId) => {
    await api.post('/relationships/remove', { userId, toId });
    await get().refreshGraph(userId);
  },
  updateSignature: async (userId, signature) => {
    const response = await api.post('/users/signature', { userId, signature });
    await get().refreshGraph(userId);
    return response.data?.signature ?? null;
  },
  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: position.x,
              y: position.y,
              z: position.z,
              fx: position.x,
              fy: position.y,
              fz: position.z,
            }
          : node,
      ),
    }));
  },
}));
