import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import {
  FieldValue,
  type BulkWriter,
  type DocumentData,
  type Query,
} from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';

/**
 * A busy account can have thousands of swipes; the default 60s is not
 * enough headroom for the whole cascade plus Storage cleanup.
 */
const DELETE_TIMEOUT_SECONDS = 300;

/**
 * 12 — "Удаление аккаунта самим пользователем", mandatory for the App
 * Store (5.1.1v) and Google Play. Runs as admin, which also sidesteps
 * `auth/requires-recent-login`: the client SDK refuses to delete a user
 * whose sign-in is old, and forcing a re-authentication dance would just
 * strand people who signed in months ago.
 *
 * Order matters. Firestore and Storage go first and the Auth user last,
 * so a failure anywhere in between leaves an account that can sign in
 * and retry, rather than orphaned data nobody can reach.
 *
 * What deliberately survives, by product decision:
 * - conversations. A chat belongs to both sides, so the other participant
 *   keeps their history, including this user's messages and media; the
 *   chat is marked instead, and every client renders the departed side as
 *   "deleted user" and turns the chat read-only (there is no one left to
 *   answer, and /matches and /friends are gone, so the server would refuse
 *   a send anyway).
 * - reports, in both directions. They are the moderation record: deleting
 *   an account must not erase the complaints against it, and a complaint
 *   this user filed is still evidence about someone else.
 * - other users' `blockedUserIds` entries naming this uid: harmless, since
 *   Firebase never reuses a uid, and clearing them would mean scanning
 *   the whole user collection.
 */
export const deleteAccount = onCall(
  { timeoutSeconds: DELETE_TIMEOUT_SECONDS },
  async request => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    // Kept, not deleted — these get marked below, and their ids drive the
    // staging-file cleanup in Storage.
    const chats = await db
      .collection('chats')
      .where('participantIds', 'array-contains', uid)
      .select()
      .get();

    const writer = db.bulkWriter();
    await Promise.all([
      deleteMatching(
        writer,
        db.collection('swipes').where('swiperId', '==', uid),
      ),
      deleteMatching(
        writer,
        db.collection('swipes').where('targetId', '==', uid),
      ),
      deleteMatching(
        writer,
        db.collection('matches').where('userIds', 'array-contains', uid),
      ),
      deleteMatching(
        writer,
        db.collection('friends').where('userIds', 'array-contains', uid),
      ),
      // Frees the @username for someone else.
      deleteMatching(
        writer,
        db.collection('usernames').where('uid', '==', uid),
      ),
    ]);
    // What the other participant's client keys off to show "deleted
    // user" and stop offering a composer. `participantIds` keeps this uid
    // so the chat id stays the deterministic pair id it was built from.
    chats.docs.forEach(chat =>
      writer.update(chat.ref, {
        deletedParticipantIds: FieldValue.arrayUnion(uid),
      }),
    );
    writer.delete(db.collection('users').doc(uid));
    await writer.close();

    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    // Published chat media stays with the conversation; only this user's
    // staging area goes, since anything left there was never sent.
    await Promise.all(
      chats.docs.map(chat =>
        bucket.deleteFiles({ prefix: `chats/${chat.id}/pending/${uid}/` }),
      ),
    );

    await getAuth().deleteUser(uid);

    logger.info('deleteAccount: account deleted', {
      uid,
      chatCount: chats.size,
    });
    return { deleted: true };
  },
);

/** Queues every document a query matches for deletion. `select()` keeps the read to ids only. */
async function deleteMatching(
  writer: BulkWriter,
  query: Query<DocumentData>,
): Promise<void> {
  const snapshot = await query.select().get();
  snapshot.docs.forEach(doc => writer.delete(doc.ref));
}
