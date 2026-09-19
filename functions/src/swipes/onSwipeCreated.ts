import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { buildPairId } from '../shared/pairId';

interface SwipeDoc {
  swiperId: string;
  targetId: string;
  action: 'like' | 'dislike';
}

export const onSwipeCreated = onDocumentCreated(
  'swipes/{swipeId}',
  async event => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const swipe = snapshot.data() as SwipeDoc;
    if (swipe.action !== 'like') {
      return;
    }

    const reciprocalLike = await db
      .collection('swipes')
      .where('swiperId', '==', swipe.targetId)
      .where('targetId', '==', swipe.swiperId)
      .where('action', '==', 'like')
      .limit(1)
      .get();

    if (reciprocalLike.empty) {
      return;
    }

    // Deterministic id so a re-delivered trigger event can't create a
    // duplicate match (14.2 — triggers aren't idempotent by default).
    const matchRef = db
      .collection('matches')
      .doc(buildPairId(swipe.swiperId, swipe.targetId));

    let created = false;
    await db.runTransaction(async (transaction: Transaction) => {
      const existingMatch = await transaction.get(matchRef);
      if (existingMatch.exists) {
        return;
      }
      const now = FieldValue.serverTimestamp();
      transaction.set(matchRef, {
        userIds: [swipe.swiperId, swipe.targetId].sort(),
        createdAt: now,
        lastMessageAt: now,
      });
      created = true;
    });

    if (created) {
      logger.info('onSwipeCreated: match created', {
        matchId: matchRef.id,
      });
    }

    // TODO(TZ section 10 — push notifications): send FCM push to both users
    // once device token registration exists.
  },
);
