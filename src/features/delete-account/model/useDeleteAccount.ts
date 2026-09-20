import { useCallback, useRef, useState } from 'react';
import auth from '@react-native-firebase/auth';
import { requestAccountDeletion } from '../api/deleteAccountApi';

interface UseDeleteAccountResult {
  isDeleting: boolean;
  /** Resolves once the account is gone and the session has been cleared. */
  deleteAccount: () => Promise<void>;
}

export function useDeleteAccount(): UseDeleteAccountResult {
  const [isDeleting, setIsDeleting] = useState(false);
  // A ref, not the state above: two taps in the same tick would both read
  // the state as `false` and fire a second deletion, which then fails
  // with an error alert on top of an account that is already gone.
  const isDeletingRef = useRef(false);

  const deleteAccount = useCallback(async () => {
    if (isDeletingRef.current) {
      return;
    }
    isDeletingRef.current = true;
    setIsDeleting(true);
    try {
      await requestAccountDeletion();
      // The Auth user is already gone server-side; this clears the local
      // session so AuthProvider drops back to the sign-in flow instead of
      // holding a token for a user that no longer exists.
      await auth().signOut();
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }, []);

  return { isDeleting, deleteAccount };
}
