import storage from '@react-native-firebase/storage';

/** Uploads to the private per-chat staging path — see storage.rules and functions/src/chat/sendChatMedia. */
export async function uploadToPendingChatStorage(
  chatId: string,
  uid: string,
  localUri: string,
  extension: string,
): Promise<string> {
  const path = `chats/${chatId}/pending/${uid}/${Date.now()}.${extension}`;
  await storage().ref(path).putFile(localUri);
  return path;
}

// Resolving the same path twice per chat render would be two needless
// round trips; the mapping never changes for a given path.
const urlCache = new Map<string, Promise<string>>();

/**
 * 6.1/6.3 — chat media messages store a Storage PATH, not a URL: the
 * files are readable only by the two participants (storage.rules), so
 * the download URL has to be requested by an authenticated participant
 * rather than baked into the message. Profile photos are the opposite
 * case — public by design, so they are stored as plain URLs.
 */
export function resolveChatMediaUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached) {
    return cached;
  }
  const pending = storage()
    .ref(path)
    .getDownloadURL()
    .catch((error: unknown) => {
      // A failed lookup must not be cached, or the bubble stays broken
      // for the rest of the session.
      urlCache.delete(path);
      throw error;
    });
  urlCache.set(path, pending);
  return pending;
}
