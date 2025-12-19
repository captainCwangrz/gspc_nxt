import { create } from 'zustand';
import api from '../lib/api';

interface UserState {
  userId: number | null;
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    confirmPassword: string;
    realName: string;
    dob: string;
    avatar?: string;
  }) => Promise<void>;
  logout: () => void;
}

const getStoredValue = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(key);
};

export const useUserStore = create<UserState>((set) => ({
  userId: getStoredValue('gspc_user_id')
    ? Number(getStoredValue('gspc_user_id'))
    : null,
  token: getStoredValue('gspc_token'),
  username: getStoredValue('gspc_username'),
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, userId } = response.data;
    set({ token, userId, username });
    localStorage.setItem('gspc_token', token);
    localStorage.setItem('gspc_user_id', String(userId));
    localStorage.setItem('gspc_username', username);
  },
  register: async (payload) => {
    await api.post('/auth/register', payload);
  },
  logout: () => {
    set({ token: null, userId: null, username: null });
    localStorage.removeItem('gspc_token');
    localStorage.removeItem('gspc_user_id');
    localStorage.removeItem('gspc_username');
  },
}));
