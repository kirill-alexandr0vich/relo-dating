import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../firebaseAdmin';
import { friendshipNotificationFor } from './notificationRules';
import { notifyUser } from './sendPush';

interface FriendshipDoc {
  userIds: string[];
  requestedBy: string;
  status: string;
  addedVia: string;
}

/**
 * 10 — "Новая заявка в друзья" and "Заявка в друзья принята" (5.2). Both
 * live in one trigger because they are two states of the same document;
 * which one (if either) a write earned is decided by
 * `friendshipNotificationFor`.
 */
export const onFriendshipWritten = onDocumentWritten(
  'friends/{friendshipId}',
  async event => {
    const before = event.data?.before.data() as FriendshipDoc | undefined;
    const after = event.data?.after.data() as FriendshipDoc | undefined;

    const notification = friendshipNotificationFor(before, after);
    if (!notification || !after) {
      return;
    }

    // A request notifies the other side; an acceptance notifies whoever
    // sent it.
    const recipientId =
      notification === 'friend_request'
        ? after.userIds.find(id => id !== after.requestedBy)
        : after.requestedBy;
    const actorId =
      notification === 'friend_request'
        ? after.requestedBy
        : after.userIds.find(id => id !== after.requestedBy);
    if (!recipientId || !actorId) {
      return;
    }

    const actorSnapshot = await db.collection('users').doc(actorId).get();

    await notifyUser(
      recipientId,
      notification,
      { name: (actorSnapshot.data()?.name as string) ?? '' },
      { type: 'friend', uid: actorId },
    );
  },
);
