import React, { PropsWithChildren, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import {
  useUserStore,
  subscribeToUserRecord,
  isRegistrationComplete,
} from 'entities/user';

export function AuthProvider({ children }: PropsWithChildren) {
  const setRecord = useUserStore(state => state.setRecord);
  const setSignedOut = useUserStore(state => state.setSignedOut);

  useEffect(() => {
    let unsubscribeUserRecord: (() => void) | undefined;

    const unsubscribeAuth = auth().onAuthStateChanged(firebaseUser => {
      unsubscribeUserRecord?.();

      if (!firebaseUser) {
        setSignedOut();
        return;
      }

      unsubscribeUserRecord = subscribeToUserRecord(
        firebaseUser.uid,
        record => {
          // Briefly null right after sign-up, until the sign-in flow's
          // ensureUserRecordExists() write completes — the next snapshot
          // carries the freshly created document.
          if (!record) {
            return;
          }
          setRecord(
            record,
            isRegistrationComplete(record)
              ? 'ready'
              : 'registration-incomplete',
          );
        },
        error => {
          console.error('Failed to subscribe to user record', error);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserRecord?.();
    };
  }, [setRecord, setSignedOut]);

  return <>{children}</>;
}
