import functions from '@react-native-firebase/functions';

/** Matches the `message` string functions/src/moderation/*.ts throws on rejection. */
export const MODERATION_REJECTED_MESSAGE = 'moderation_rejected';
export const MAX_PHOTOS_REACHED_MESSAGE = 'max_photos_reached';

/**
 * 7.2 — the only way to set `name`/`bio`: both are blocked from direct
 * client writes in firestore.rules so they can't skip moderation.
 */
export async function submitProfileText(
  field: 'name' | 'bio',
  value: string,
): Promise<void> {
  const callable = functions().httpsCallable<
    { field: 'name' | 'bio'; value: string },
    { field: string; value: string }
  >('submitProfileText');
  await callable({ field, value });
}

export async function submitProfilePhoto(pendingPath: string): Promise<string> {
  const callable = functions().httpsCallable<
    { pendingPath: string },
    { url: string }
  >('submitProfilePhoto');
  const response = await callable({ pendingPath });
  return response.data.url;
}

export async function removeProfilePhoto(url: string): Promise<void> {
  const callable = functions().httpsCallable<
    { url: string },
    { removed: boolean }
  >('removeProfilePhoto');
  await callable({ url });
}

export async function reorderProfilePhotos(urls: string[]): Promise<void> {
  const callable = functions().httpsCallable<
    { urls: string[] },
    { avatarUrls: string[] }
  >('reorderProfilePhotos');
  await callable({ urls });
}
