import firestore from '@react-native-firebase/firestore';

/**
 * 10 — everything push-related lives in a private subdocument rather than
 * on `/users/{uid}` itself, because that document is readable by everyone
 * you are connected to (see firestore.rules). Device tokens are not worth
 * handing out, and `activeChatId` is worse: the chat id encodes the uid of
 * whoever you are talking to right now, so on the public document it
 * would tell every friend and match who you are currently chatting with.
 */
function pushSettingsDoc(uid: string) {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('private')
    .doc('push');
}

/**
 * Registers this device. Several tokens per account is normal (phone plus
 * tablet, or a reinstall); Cloud Functions prune the ones Firebase reports
 * as dead when a send fails.
 */
export async function saveDeviceToken(
  uid: string,
  token: string,
): Promise<void> {
  await pushSettingsDoc(uid).set(
    { fcmTokens: firestore.FieldValue.arrayUnion(token) },
    { merge: true },
  );
}

/** Signing out on this device must not keep delivering that account's pushes to it. */
export async function removeDeviceToken(
  uid: string,
  token: string,
): Promise<void> {
  await pushSettingsDoc(uid).set(
    { fcmTokens: firestore.FieldValue.arrayRemove(token) },
    { merge: true },
  );
}

/** 10/11 — push text is written in the recipient's interface language, so the server needs to know it. */
export async function saveInterfaceLanguage(
  uid: string,
  language: string,
): Promise<void> {
  await pushSettingsDoc(uid).set(
    { interfaceLanguage: language },
    { merge: true },
  );
}

/**
 * 10 — presence flag: the chat this user is looking at, or `null` when
 * they leave it. The message trigger skips the push when it matches the
 * chat a message was just sent to.
 */
export async function setActiveChatId(
  uid: string,
  chatId: string | null,
): Promise<void> {
  await pushSettingsDoc(uid).set({ activeChatId: chatId }, { merge: true });
}
