import { create } from 'zustand';
import { api } from '../lib/axios';

interface User {
  id: string;
  email: string;
  role: { name: string; slug: string };
  tenant: { id: string; name: string };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  
  login: async (data) => {
    await api.post('/auth/login', data);
    const res = await api.get('/users/me');
    set({ user: res.data });
  },
  
  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null });
  },
  
  initAuth: async () => {
    try {
      const res = await api.get('/users/me');
      set({ user: res.data, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  }
}));
