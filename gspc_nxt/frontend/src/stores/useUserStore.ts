import { create } from 'zustand';
import api from '../lib/api';

interface UserState {
  userId: number | null;
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  token: null,
  username: null,
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, userId } = response.data;
    set({ token, userId, username });
    localStorage.setItem('gspc_token', token);
    localStorage.setItem('gspc_user_id', String(userId));
  },
  logout: () => {
    set({ token: null, userId: null, username: null });
    localStorage.removeItem('gspc_token');
    localStorage.removeItem('gspc_user_id');
  },
}));
