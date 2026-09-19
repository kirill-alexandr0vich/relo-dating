import { create } from 'zustand';
import type { UserRecord } from './types';

export type SessionStatus =
  | 'loading'
  | 'signed-out'
  | 'registration-incomplete'
  | 'ready';

interface UserState {
  status: SessionStatus;
  record: UserRecord | null;
  setSignedOut: () => void;
  setRecord: (record: UserRecord, status: SessionStatus) => void;
}

export const useUserStore = create<UserState>(set => ({
  status: 'loading',
  record: null,
  setSignedOut: () => set({ status: 'signed-out', record: null }),
  setRecord: (record, status) => set({ record, status }),
}));
