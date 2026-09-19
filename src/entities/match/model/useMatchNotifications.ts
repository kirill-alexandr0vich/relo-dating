import { useCallback, useEffect, useState } from 'react';
import { fetchUserRecord, type UserRecord } from 'entities/user';
import { subscribeToNewMatches } from '../api/matchApi';
import { getOtherParticipant, type Match } from './types';

export interface MatchNotification {
  match: Match;
  otherUser: UserRecord;
}

/** Drives the "It's a match" screen (4.1): pops up the moment a match doc appears for this user. */
export function useMatchNotifications(uid: string) {
  const [notification, setNotification] = useState<MatchNotification | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = subscribeToNewMatches(uid, match => {
      fetchUserRecord(getOtherParticipant(match, uid)).then(otherUser => {
        if (otherUser) {
          setNotification({ match, otherUser });
        }
      });
    });
    return unsubscribe;
  }, [uid]);

  const dismiss = useCallback(() => setNotification(null), []);

  return { notification, dismiss };
}
