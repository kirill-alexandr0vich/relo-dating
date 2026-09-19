import firestore from '@react-native-firebase/firestore';
import type { Match } from '../model/types';

/**
 * Fires only for matches created AFTER this listener was mounted — the
 * first snapshot (existing matches) is treated as hydration, not "new"
 * matches, so a screen mounting this hook doesn't immediately pop the
 * "It's a match" modal for something that happened yesterday.
 */
export function subscribeToNewMatches(
  uid: string,
  onNewMatch: (match: Match) => void,
) {
  let isInitialSnapshot = true;
  return firestore()
    .collection('matches')
    .where('userIds', 'array-contains', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(
      snapshot => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            onNewMatch({
              id: change.doc.id,
              ...(change.doc.data() as Omit<Match, 'id'>),
            });
          }
        });
      },
      error => {
        console.error('Failed to subscribe to matches', error);
      },
    );
}
