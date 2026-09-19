import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin';
import { reorderProfilePhotosInputSchema } from './schema';

/** 3.2 — "первое фото — главное": lets the client reorder without granting general write access to `avatarUrls`. */
export const reorderProfilePhotos = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = reorderProfilePhotosInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { urls } = parsed.data;

  const userRef = db.collection('users').doc(uid);
  const snapshot = await userRef.get();
  const currentUrls =
    (snapshot.data()?.avatarUrls as string[] | undefined) ?? [];

  const isSamePhotoSet =
    urls.length === currentUrls.length &&
    [...urls]
      .sort()
      .every((url, index) => url === [...currentUrls].sort()[index]);
  if (!isSamePhotoSet) {
    throw new HttpsError(
      'invalid-argument',
      'Can only reorder your existing photos, not add or remove any.',
    );
  }

  await userRef.update({ avatarUrls: urls });

  return { avatarUrls: urls };
});
