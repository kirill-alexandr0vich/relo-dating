import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { isImageSafe } from './imageModeration';
import { submitProfilePhotoInputSchema } from './schema';

const MAX_AVATARS_PER_PROFILE = 6;

/**
 * 7.2/12 — the client uploads to a private `users/{uid}/pending/...`
 * path first; only after this callable's SafeSearch check passes does
 * the file move to the public `users/{uid}/photos/...` path and get
 * added to `avatarUrls` (also blocked from direct client writes, for
 * the same reason as name/bio: otherwise moderation is trivially
 * bypassable by writing the URL straight to Firestore).
 */
export const submitProfilePhoto = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = submitProfilePhotoInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { pendingPath } = parsed.data;

  if (!pendingPath.startsWith(`users/${uid}/pending/`)) {
    throw new HttpsError(
      'permission-denied',
      'Can only publish your own pending upload.',
    );
  }

  const userRef = db.collection('users').doc(uid);

  // Fail fast for the common (non-racing) case before paying for a Vision
  // API call — the authoritative check happens in the transaction below.
  const userSnapshot = await userRef.get();
  const avatarUrls =
    (userSnapshot.data()?.avatarUrls as string[] | undefined) ?? [];
  if (avatarUrls.length >= MAX_AVATARS_PER_PROFILE) {
    throw new HttpsError('failed-precondition', 'max_photos_reached');
  }

  const bucket = getStorage().bucket();
  const pendingFile = bucket.file(pendingPath);
  const [exists] = await pendingFile.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'Pending upload not found.');
  }

  const isSafe = await isImageSafe(`gs://${bucket.name}/${pendingPath}`);
  if (!isSafe) {
    await pendingFile.delete({ ignoreNotFound: true });
    logger.warn('submitProfilePhoto: rejected by SafeSearch', { uid });
    throw new HttpsError('failed-precondition', 'moderation_rejected');
  }

  const fileName = pendingPath.split('/').pop();
  const publicPath = `users/${uid}/photos/${fileName}`;
  await pendingFile.move(publicPath);
  const publicFile = bucket.file(publicPath);
  await publicFile.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${publicPath}`;

  try {
    // Re-checked here, inside the transaction, because the fail-fast
    // check above isn't atomic with this write: two concurrent uploads
    // can both pass it and race to add a 7th+ photo.
    await db.runTransaction(async (transaction: Transaction) => {
      const snapshot = await transaction.get(userRef);
      const currentUrls =
        (snapshot.data()?.avatarUrls as string[] | undefined) ?? [];
      if (currentUrls.length >= MAX_AVATARS_PER_PROFILE) {
        throw new HttpsError('failed-precondition', 'max_photos_reached');
      }
      transaction.update(userRef, {
        avatarUrls: FieldValue.arrayUnion(url),
      });
    });
  } catch (error) {
    // The losing side of the race already has a public, moderated file
    // with nothing pointing at it — clean it up rather than leaking it.
    await publicFile.delete({ ignoreNotFound: true });
    throw error;
  }

  return { url };
});
