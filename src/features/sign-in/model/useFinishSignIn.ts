import { useCallback } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { ensureUserRecordExists } from 'entities/user';
import { linkPendingCredential } from '../api/accountLinking';
import { usePendingLinkStore } from './pendingLinkStore';

/**
 * Runs after any successful sign-in, regardless of which of the 4 methods
 * was used. If a sign-in attempt earlier hit
 * `auth/account-exists-with-different-credential`, the pending credential
 * from that attempt is linked to the account the user just signed into
 * (3.1 — "объединение аккаунтов"), so both methods end up on the same
 * `/users/{uid}` document instead of creating a second one.
 */
export function useFinishSignIn() {
  const pendingLink = usePendingLinkStore(state => state.pendingLink);
  const clearPendingLink = usePendingLinkStore(state => state.clearPendingLink);

  return useCallback(
    async (userCredential: FirebaseAuthTypes.UserCredential) => {
      if (pendingLink) {
        await linkPendingCredential(pendingLink.credential);
        clearPendingLink();
      }
      // The 18+ checkbox on the method-selection screen already gated
      // reaching any sign-in method, so it's safe to record it here.
      await ensureUserRecordExists(userCredential.user.uid, true);
    },
    [pendingLink, clearPendingLink],
  );
}
