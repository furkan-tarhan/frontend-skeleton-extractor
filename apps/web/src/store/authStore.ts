import { create } from 'zustand';
import type { UserWithStats } from '@/types/user';

interface AuthState {
  user: UserWithStats | null;
  setUser: (user: UserWithStats | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
