import { create } from 'zustand';
import type { User } from './types';

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>(set => ({
  currentUser: null,
  setCurrentUser: user => set({ currentUser: user }),
}));
