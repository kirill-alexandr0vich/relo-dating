import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { callableOptions } from '../shared/callableOptions';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { buildPairId } from '../shared/pairId';
import { blockUserInputSchema } from './schema';

/**
 * 6.2 — blocking removes the shared /matches and /friends docs (both are
 * Cloud-Function-write-only, so the client can't do this itself) and adds
 * the target to the blocker's own `blockedUserIds` (which IS otherwise
 * client-writable, but bundling it here keeps the whole operation atomic).
 * Unblocking is a plain client-side `arrayRemove` — no Cloud Function
 * needed since it has no other side effects (12/6.2: history, matches and
 * friendships are not restored).
 */
export const blockUser = onCall(callableOptions(), async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = blockUserInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { targetUid } = parsed.data;

  if (targetUid === uid) {
    throw new HttpsError('invalid-argument', 'Cannot block yourself.');
  }

  const pairId = buildPairId(uid, targetUid);
  const batch = db.batch();
  batch.set(
    db.collection('users').doc(uid),
    { blockedUserIds: FieldValue.arrayUnion(targetUid) },
    { merge: true },
  );
  batch.delete(db.collection('matches').doc(pairId));
  batch.delete(db.collection('friends').doc(pairId));
  await batch.commit();

  logger.info('blockUser: user blocked', { uid, targetUid });
  return { blocked: true };
});
