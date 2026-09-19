import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  FieldValue,
  Timestamp,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { getNextUtcMidnight, hasCounterExpired } from '../shared/dateUtils';
import { recordSwipeInputSchema } from './schema';

const FREE_DAILY_SWIPE_LIMIT = 20;

interface SwiperDoc {
  premium?: boolean;
  swipesUsedToday?: number;
  swipesResetAt?: Timestamp;
}

/**
 * The only path that is allowed to write to `/swipes` (see
 * firestore.rules — direct client writes are blocked). Recording the
 * swipe and enforcing/advancing the free-tier daily limit happen in one
 * transaction so a user can never exceed the limit by firing swipes
 * faster than a separate counter update could keep up (12 — anti-abuse).
 *
 * Match creation itself is intentionally NOT done here: a separate
 * `onSwipeCreated` trigger reacts to the write below, per 4.4 and the
 * "one function, one responsibility" rule in 14.2.
 */
export const recordSwipe = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = recordSwipeInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid swipe payload.');
  }
  const { targetId, action } = parsed.data;

  if (targetId === uid) {
    throw new HttpsError('invalid-argument', 'Cannot swipe on yourself.');
  }

  const swiperRef = db.collection('users').doc(uid);
  const swipeRef = db.collection('swipes').doc();

  await db.runTransaction(async (transaction: Transaction) => {
    const swiperSnapshot = await transaction.get(swiperRef);
    const swiper = (swiperSnapshot.data() as SwiperDoc | undefined) ?? {};

    if (swiper.premium !== true) {
      const now = Timestamp.now();
      const expired = hasCounterExpired(
        swiper.swipesResetAt?.toDate(),
        now.toDate(),
      );
      const usedToday = expired ? 0 : swiper.swipesUsedToday ?? 0;

      if (usedToday >= FREE_DAILY_SWIPE_LIMIT) {
        throw new HttpsError(
          'resource-exhausted',
          'Daily swipe limit reached.',
        );
      }

      transaction.set(
        swiperRef,
        {
          swipesUsedToday: usedToday + 1,
          swipesResetAt: Timestamp.fromDate(
            expired
              ? getNextUtcMidnight(now.toDate())
              : swiper.swipesResetAt!.toDate(),
          ),
        },
        { merge: true },
      );
    }

    transaction.set(swipeRef, {
      swiperId: uid,
      targetId,
      action,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { swipeId: swipeRef.id };
});
