import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../firebaseAdmin';
import { notifyUser } from './sendPush';

interface MatchDoc {
  userIds: string[];
}

/**
 * 10 — "Новый мэтч" for both sides. A separate trigger rather than a step
 * inside onSwipeCreated: 14.2 asks that creating the match and announcing
 * it not share a function, so a failing push can never take the match
 * itself down with it.
 */
export const onMatchCreated = onDocumentCreated(
  'matches/{matchId}',
  async event => {
    const match = event.data?.data() as MatchDoc | undefined;
    if (!match?.userIds || match.userIds.length !== 2) {
      return;
    }
    const [first, second] = match.userIds;

    const [firstSnapshot, secondSnapshot] = await Promise.all([
      db.collection('users').doc(first).get(),
      db.collection('users').doc(second).get(),
    ]);
    const firstName = (firstSnapshot.data()?.name as string) ?? '';
    const secondName = (secondSnapshot.data()?.name as string) ?? '';

    await Promise.all([
      notifyUser(
        first,
        'match',
        { name: secondName },
        { type: 'match', chatId: event.params.matchId, uid: second },
      ),
      notifyUser(
        second,
        'match',
        { name: firstName },
        { type: 'match', chatId: event.params.matchId, uid: first },
      ),
    ]);
  },
);
