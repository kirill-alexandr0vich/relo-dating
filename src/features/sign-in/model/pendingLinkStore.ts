import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface PendingLink {
  email?: string;
  credential: FirebaseAuthTypes.AuthCredential;
}

interface PendingLinkState {
  pendingLink: PendingLink | null;
  setPendingLink: (pendingLink: PendingLink) => void;
  clearPendingLink: () => void;
}

export const usePendingLinkStore = create<PendingLinkState>(set => ({
  pendingLink: null,
  setPendingLink: pendingLink => set({ pendingLink }),
  clearPendingLink: () => set({ pendingLink: null }),
}));
