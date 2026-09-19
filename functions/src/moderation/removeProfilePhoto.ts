import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { db } from '../firebaseAdmin';
import { removeProfilePhotoInputSchema } from './schema';

export const removeProfilePhoto = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = removeProfilePhotoInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { url } = parsed.data;

  const expectedPrefix = `https://storage.googleapis.com/${
    getStorage().bucket().name
  }/users/${uid}/photos/`;
  if (!url.startsWith(expectedPrefix)) {
    throw new HttpsError(
      'permission-denied',
      'Can only remove your own photos.',
    );
  }

  await db
    .collection('users')
    .doc(uid)
    .update({ avatarUrls: FieldValue.arrayRemove(url) });

  const path = url.slice(
    `https://storage.googleapis.com/${getStorage().bucket().name}/`.length,
  );
  await getStorage().bucket().file(path).delete({ ignoreNotFound: true });

  return { removed: true };
});
