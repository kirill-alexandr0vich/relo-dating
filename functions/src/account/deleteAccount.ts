import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import type { BulkWriter, DocumentData, Query } from 'firebase-admin/firestore';
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
 * What deliberately survives:
 * - reports ABOUT this user (`targetId`), which are a moderation record —
 *   otherwise deleting an account would erase the complaints against it.
 *   Reports BY this user are their own data and go.
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

    // Fetched before anything is deleted: the ids drive both the
    // message-subcollection deletes and the Storage cleanup below.
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
      // Deleting these can drop a target below the auto-hide threshold,
      // but onReportWritten never un-hides anyone (7.3 — only a moderator
      // does), so no one is quietly un-hidden by someone leaving.
      deleteMatching(
        writer,
        db.collection('reports').where('reporterId', '==', uid),
      ),
      // Frees the @username for someone else.
      deleteMatching(
        writer,
        db.collection('usernames').where('uid', '==', uid),
      ),
    ]);
    writer.delete(db.collection('users').doc(uid));
    await writer.close();

    // A 1:1 chat with a user who no longer exists is deleted outright
    // rather than kept for the other side: the messages are this user's
    // personal data too. recursiveDelete also clears the `messages`
    // subcollection, which a plain doc delete would leave behind.
    for (const chat of chats.docs) {
      await db.recursiveDelete(chat.ref);
    }

    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    await Promise.all(
      chats.docs.map(chat =>
        bucket.deleteFiles({ prefix: `chats/${chat.id}/` }),
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
